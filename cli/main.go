package main

import (
	"fmt"
	"os"

	"adventure-cli/internal/config"
	"adventure-cli/internal/tui"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "adventure-cli:", err)
		os.Exit(1)
	}

	p := tea.NewProgram(tui.NewModel(cfg))
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "adventure-cli:", err)
		os.Exit(1)
	}
}
