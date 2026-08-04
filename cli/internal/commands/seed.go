package commands

import "os/exec"

// SeedScript pairs an npm script name with a human-readable label.
type SeedScript struct {
	Name    string
	Label   string
	Confirm bool
}

// SeedScripts is the single source of truth for available seed scripts,
// consumed by both the menu and the runner.
var SeedScripts = []SeedScript{
	{Name: "seed:all", Label: "seed:all (runs 6 scripts in sequence)", Confirm: true},
	{Name: "seed:locations", Label: "seed:locations"},
	{Name: "seed:district-boundaries", Label: "seed:district-boundaries"},
	{Name: "seed:master-data", Label: "seed:master-data"},
	{Name: "seed:system-settings", Label: "seed:system-settings"},
	{Name: "seed:dev-data", Label: "seed:dev-data"},
	{Name: "backfill:contributions", Label: "backfill:contributions"},
	{Name: "recompute:contributions", Label: "recompute:contributions"},
}

// RunSeed builds the command for `npm run <script> --workspace=apps/api`.
func RunSeed(repoRoot, scriptName string) *exec.Cmd {
	cmd := exec.Command("npm", "run", scriptName, "--workspace=apps/api")
	cmd.Dir = repoRoot
	return cmd
}
