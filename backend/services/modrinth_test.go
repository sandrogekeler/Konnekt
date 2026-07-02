package services

import "testing"

func TestBuildFacetsEmpty(t *testing.T) {
	if got := buildFacets("", "", nil); got != "" {
		t.Errorf("buildFacets(empty) = %q, want empty string", got)
	}
}

func TestBuildFacetsVersionOnly(t *testing.T) {
	got := buildFacets("1.20.1", "", nil)
	want := `[["versions:1.20.1"]]`
	if got != want {
		t.Errorf("buildFacets(version only) = %q, want %q", got, want)
	}
}

func TestBuildFacetsLoaderWithModrinthMapping(t *testing.T) {
	got := buildFacets("", "fabric", nil)
	want := `[["project_type:mod"],["categories:fabric"]]`
	if got != want {
		t.Errorf("buildFacets(fabric) = %q, want %q", got, want)
	}
}

func TestBuildFacetsLoaderWithoutModrinthMapping(t *testing.T) {
	// vanilla maps to project_type "mod" but has no modrinthLoader category.
	got := buildFacets("", "vanilla", nil)
	want := `[["project_type:mod"]]`
	if got != want {
		t.Errorf("buildFacets(vanilla) = %q, want %q", got, want)
	}
}

func TestBuildFacetsUnknownLoaderIgnored(t *testing.T) {
	got := buildFacets("1.20.1", "not-a-real-loader", nil)
	want := `[["versions:1.20.1"]]`
	if got != want {
		t.Errorf("buildFacets(unknown loader) = %q, want %q", got, want)
	}
}

func TestBuildFacetsCategoriesSkipEmpty(t *testing.T) {
	got := buildFacets("", "", []string{"adventure", "", "economy"})
	want := `[["categories:adventure"],["categories:economy"]]`
	if got != want {
		t.Errorf("buildFacets(categories) = %q, want %q", got, want)
	}
}

func TestBuildFacetsCombinesAllGroups(t *testing.T) {
	got := buildFacets("1.20.1", "paper", []string{"economy"})
	want := `[["project_type:plugin"],["categories:paper"],["versions:1.20.1"],["categories:economy"]]`
	if got != want {
		t.Errorf("buildFacets(combined) = %q, want %q", got, want)
	}
}
