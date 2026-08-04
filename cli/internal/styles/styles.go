package styles

import "github.com/charmbracelet/lipgloss"

var (
	Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("205")).
		Padding(0, 1)

	Breadcrumb = lipgloss.NewStyle().
			Foreground(lipgloss.Color("243")).
			Padding(0, 1)

	Success = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("42"))

	Failure = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("196"))

	Hint = lipgloss.NewStyle().
		Foreground(lipgloss.Color("243")).
		Italic(true)

	Warning = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("214"))
)
