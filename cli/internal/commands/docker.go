package commands

import "os/exec"

// Environment identifies which docker-compose stack to target.
type Environment int

const (
	Dev Environment = iota
	Prod
)

func (e Environment) Label() string {
	if e == Prod {
		return "Prod"
	}
	return "Dev"
}

func (e Environment) ComposeFile() string {
	if e == Prod {
		return "docker-compose.prod.yml"
	}
	return "docker-compose.yml"
}

// Services returns the compose service names available for the given
// environment, in the order they should be offered in a picker.
func (e Environment) Services() []string {
	if e == Prod {
		return []string{"db", "api", "admin", "public", "caddy"}
	}
	return []string{"db", "api", "admin", "public"}
}

func compose(repoRoot string, env Environment, args ...string) *exec.Cmd {
	full := append([]string{"compose", "-f", env.ComposeFile()}, args...)
	cmd := exec.Command("docker", full...)
	cmd.Dir = repoRoot
	return cmd
}

func ComposeUp(repoRoot string, env Environment) *exec.Cmd {
	if env == Prod {
		return compose(repoRoot, env, "up", "-d", "--build")
	}
	return compose(repoRoot, env, "up", "-d")
}

func ComposeDown(repoRoot string, env Environment) *exec.Cmd {
	return compose(repoRoot, env, "down")
}

func ComposeRestart(repoRoot string, env Environment) *exec.Cmd {
	return compose(repoRoot, env, "restart")
}

func ComposePs(repoRoot string, env Environment) *exec.Cmd {
	return compose(repoRoot, env, "ps")
}

func ComposeLogs(repoRoot string, env Environment, service string) *exec.Cmd {
	return compose(repoRoot, env, "logs", "-f", "--tail=200", service)
}

func ImagePrune(repoRoot string) *exec.Cmd {
	cmd := exec.Command("docker", "image", "prune", "-f")
	cmd.Dir = repoRoot
	return cmd
}
