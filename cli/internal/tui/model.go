package tui

import (
	"errors"
	"os/exec"
	"strings"

	"adventure-cli/internal/config"
	"adventure-cli/internal/styles"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
)

type screenMode int

const (
	modeMenu screenMode = iota
	modeConfirm
	modeResult
)

type frame struct {
	node *Node
	list list.Model
}

// Model is the root bubbletea model driving the whole CLI.
type Model struct {
	cfg   *config.Config
	stack []frame
	mode  screenMode

	confirmTarget *Node

	resultTitle string
	resultErr   error

	width, height int
	quitting      bool
}

type commandFinishedMsg struct {
	label string
	err   error
}

func NewModel(cfg *config.Config) Model {
	root := BuildRootMenu(cfg)
	m := Model{cfg: cfg, mode: modeMenu}
	m.stack = []frame{newFrame(root)}
	return m
}

func newFrame(n *Node) frame {
	delegate := list.NewDefaultDelegate()
	l := list.New(itemsFor(n.Children), delegate, 0, 0)
	l.Title = n.Title
	l.SetShowStatusBar(false)
	l.SetFilteringEnabled(false)
	return frame{node: n, list: l}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		for i := range m.stack {
			m.stack[i].list.SetSize(msg.Width, msg.Height-6)
		}
		return m, nil

	case commandFinishedMsg:
		m.mode = modeResult
		m.resultTitle = msg.label
		m.resultErr = msg.err
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)
	}

	if m.mode == modeMenu {
		var cmd tea.Cmd
		top := &m.stack[len(m.stack)-1]
		top.list, cmd = top.list.Update(msg)
		return m, cmd
	}
	return m, nil
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch m.mode {
	case modeResult:
		m.mode = modeMenu
		return m, nil

	case modeConfirm:
		switch msg.String() {
		case "y", "Y", "enter":
			node := m.confirmTarget
			m.confirmTarget = nil
			m.mode = modeMenu
			return m, m.execute(node)
		default:
			m.confirmTarget = nil
			m.mode = modeMenu
			return m, nil
		}

	case modeMenu:
		switch msg.String() {
		case "ctrl+c":
			m.quitting = true
			return m, tea.Quit
		case "q":
			if len(m.stack) == 1 {
				m.quitting = true
				return m, tea.Quit
			}
			m.stack = m.stack[:len(m.stack)-1]
			return m, nil
		case "esc", "backspace":
			if len(m.stack) > 1 {
				m.stack = m.stack[:len(m.stack)-1]
			}
			return m, nil
		case "enter":
			return m.selectCurrent()
		}
	}

	var cmd tea.Cmd
	top := &m.stack[len(m.stack)-1]
	top.list, cmd = top.list.Update(msg)
	return m, cmd
}

func (m Model) selectCurrent() (tea.Model, tea.Cmd) {
	top := m.stack[len(m.stack)-1]
	selected, ok := top.list.SelectedItem().(menuItem)
	if !ok {
		return m, nil
	}
	node := selected.node

	if !node.IsLeaf() {
		m.stack = append(m.stack, newFrame(node))
		if m.width > 0 {
			m.stack[len(m.stack)-1].list.SetSize(m.width, m.height-6)
		}
		return m, nil
	}

	if node.Confirm {
		m.confirmTarget = node
		m.mode = modeConfirm
		return m, nil
	}

	return m, m.execute(node)
}

func (m Model) execute(node *Node) tea.Cmd {
	cmd := node.Command(m.cfg.RepoRoot)
	label := node.Title
	return tea.ExecProcess(cmd, func(err error) tea.Msg {
		return commandFinishedMsg{label: label, err: err}
	})
}

func (m Model) breadcrumb() string {
	titles := make([]string, len(m.stack))
	for i, f := range m.stack {
		titles[i] = f.node.Title
	}
	return strings.Join(titles, " > ")
}

func (m Model) View() string {
	if m.quitting {
		return ""
	}

	switch m.mode {
	case modeConfirm:
		return m.viewConfirm()
	case modeResult:
		return m.viewResult()
	default:
		return m.viewMenu()
	}
}

func (m Model) viewMenu() string {
	top := m.stack[len(m.stack)-1]
	header := styles.Breadcrumb.Render(m.breadcrumb())
	hint := styles.Hint.Render("enter: select  esc/backspace: back  q: back/quit  ctrl+c: quit")
	return header + "\n" + top.list.View() + "\n" + hint
}

func (m Model) viewConfirm() string {
	header := styles.Breadcrumb.Render(m.breadcrumb())
	warn := styles.Warning.Render("Are you sure you want to run: " + m.confirmTarget.Title + "?")
	hint := styles.Hint.Render("y: confirm  any other key: cancel")
	return header + "\n\n" + warn + "\n\n" + hint
}

func (m Model) viewResult() string {
	header := styles.Breadcrumb.Render(m.breadcrumb())
	var body string
	if m.resultErr != nil {
		var exitErr *exec.ExitError
		detail := m.resultErr.Error()
		if errors.As(m.resultErr, &exitErr) {
			detail = exitErr.Error()
		}
		body = styles.Failure.Render("✗ "+m.resultTitle+" failed") + "\n" + detail
	} else {
		body = styles.Success.Render("✓ " + m.resultTitle + " succeeded")
	}
	hint := styles.Hint.Render("press any key to continue")
	return header + "\n\n" + body + "\n\n" + hint
}
