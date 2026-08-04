package tui

import "github.com/charmbracelet/bubbles/list"

// menuItem adapts a *Node to the bubbles list.Item / DefaultItem interface.
type menuItem struct {
	node *Node
}

func (m menuItem) Title() string       { return m.node.Title }
func (m menuItem) Description() string { return m.node.Desc }
func (m menuItem) FilterValue() string { return m.node.Title }

func itemsFor(nodes []*Node) []list.Item {
	items := make([]list.Item, 0, len(nodes))
	for _, n := range nodes {
		items = append(items, menuItem{node: n})
	}
	return items
}
