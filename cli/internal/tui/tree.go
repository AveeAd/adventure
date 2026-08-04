package tui

import (
	"fmt"
	"os/exec"

	"adventure-cli/internal/commands"
	"adventure-cli/internal/config"
)

// Node is a single entry in the menu tree. A Node with Children is a
// submenu; a Node with Command is a leaf action.
type Node struct {
	Title    string
	Desc     string
	Children []*Node
	Command  func(root string) *exec.Cmd
	Confirm  bool
}

func (n *Node) IsLeaf() bool {
	return n.Command != nil
}

// BuildRootMenu constructs the full static menu tree described in the plan.
func BuildRootMenu(cfg *config.Config) *Node {
	return &Node{
		Title: "Adventure CLI",
		Children: []*Node{
			{
				Title: "Run Application",
				Desc:  "Start, stop, and inspect the docker-compose stack",
				Children: []*Node{
					environmentMenu(commands.Dev),
					environmentMenu(commands.Prod),
				},
			},
			{
				Title:    "Seed Database",
				Desc:     "Run seed and backfill scripts against apps/api",
				Children: seedMenu(),
			},
			{
				Title:    "Operational Commands",
				Desc:     "Migrations and housekeeping",
				Children: opsMenu(),
			},
		},
	}
}

func environmentMenu(env commands.Environment) *Node {
	services := env.Services()
	logsChildren := make([]*Node, 0, len(services))
	for _, svc := range services {
		svc := svc
		logsChildren = append(logsChildren, &Node{
			Title: svc,
			Desc:  fmt.Sprintf("Follow logs for %s (%s)", svc, env.Label()),
			Command: func(root string) *exec.Cmd {
				return commands.ComposeLogs(root, env, svc)
			},
		})
	}

	return &Node{
		Title: env.Label(),
		Desc:  fmt.Sprintf("%s (%s)", env.Label(), env.ComposeFile()),
		Children: []*Node{
			{
				Title: "Up",
				Desc:  "docker compose up -d" + upSuffix(env),
				Command: func(root string) *exec.Cmd {
					return commands.ComposeUp(root, env)
				},
			},
			{
				Title:   "Down",
				Desc:    "docker compose down",
				Confirm: true,
				Command: func(root string) *exec.Cmd {
					return commands.ComposeDown(root, env)
				},
			},
			{
				Title: "Restart",
				Desc:  "docker compose restart",
				Command: func(root string) *exec.Cmd {
					return commands.ComposeRestart(root, env)
				},
			},
			{
				Title: "Status (ps)",
				Desc:  "docker compose ps",
				Command: func(root string) *exec.Cmd {
					return commands.ComposePs(root, env)
				},
			},
			{
				Title:    "Logs",
				Desc:     "Follow logs for a service",
				Children: logsChildren,
			},
		},
	}
}

func upSuffix(env commands.Environment) string {
	if env == commands.Prod {
		return " --build"
	}
	return ""
}

func seedMenu() []*Node {
	nodes := make([]*Node, 0, len(commands.SeedScripts))
	for _, s := range commands.SeedScripts {
		s := s
		nodes = append(nodes, &Node{
			Title:   s.Label,
			Desc:    fmt.Sprintf("npm run %s --workspace=apps/api", s.Name),
			Confirm: s.Confirm,
			Command: func(root string) *exec.Cmd {
				return commands.RunSeed(root, s.Name)
			},
		})
	}
	return nodes
}

func opsMenu() []*Node {
	return []*Node{
		{
			Title: "Migrate Deploy",
			Desc:  "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma",
			Command: func(root string) *exec.Cmd {
				return commands.MigrateDeploy(root)
			},
		},
		{
			Title:   "Docker Image Prune",
			Desc:    "docker image prune -f",
			Confirm: true,
			Command: func(root string) *exec.Cmd {
				return commands.ImagePrune(root)
			},
		},
	}
}
