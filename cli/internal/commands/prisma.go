package commands

import "os/exec"

// MigrateDeploy runs `prisma migrate deploy` against the api schema,
// mirroring the command baked into docker-compose.yml's api service.
func MigrateDeploy(repoRoot string) *exec.Cmd {
	cmd := exec.Command("npx", "prisma", "migrate", "deploy", "--schema=apps/api/prisma/schema.prisma")
	cmd.Dir = repoRoot
	return cmd
}
