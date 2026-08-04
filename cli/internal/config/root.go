package config

import (
	"fmt"
	"os"
	"path/filepath"
)

// Config holds resolved settings shared across the CLI.
type Config struct {
	RepoRoot string
}

// ResolveRepoRoot walks up from the current working directory looking for
// the adventure monorepo root, identified by the presence of both
// docker-compose.yml and apps/api/prisma/schema.prisma.
func ResolveRepoRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("could not determine current directory: %w", err)
	}

	for i := 0; i < 6; i++ {
		compose := filepath.Join(dir, "docker-compose.yml")
		schema := filepath.Join(dir, "apps", "api", "prisma", "schema.prisma")
		if fileExists(compose) && fileExists(schema) {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", fmt.Errorf("could not locate adventure repo root (looked for docker-compose.yml + apps/api/prisma/schema.prisma) — run from within the adventure monorepo checkout")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// Load resolves the repo root and returns a ready-to-use Config.
func Load() (*Config, error) {
	root, err := ResolveRepoRoot()
	if err != nil {
		return nil, err
	}
	return &Config{RepoRoot: root}, nil
}
