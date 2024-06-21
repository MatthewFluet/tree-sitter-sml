package tree_sitter_sml_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/MatthewFluet/tree-sitter-sml"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_sml.Language())
	if language == nil {
		t.Errorf("Error loading SML grammar")
	}
}
