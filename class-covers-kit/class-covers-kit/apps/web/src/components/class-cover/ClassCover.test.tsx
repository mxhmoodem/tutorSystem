// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NO_ICON, resolveCover, type CoverSelection } from "@klasio/shared/class-covers";
import { CoverArt, CoverPicker, coverStyleVars } from "./index";

const ctx = { subjectName: "A-Level Physics", seed: "class_1" };

afterEach(cleanup);

describe("CoverArt", () => {
  it("is decorative and paints the palette gradient", () => {
    const cover = resolveCover({ presetId: "sky-orbit", iconId: "atom" }, ctx);
    const { container } = render(<CoverArt cover={cover} variant="card" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("data-cover-preset")).toBe("sky-orbit");
    const stops = Array.from(container.querySelectorAll("stop")).map((s) => s.getAttribute("stop-color"));
    expect(stops).toEqual([cover.palette.card.from, cover.palette.card.to]);
    expect(svg?.getAttribute("data-cover-icon")).toBe("atom");
  });

  it("uses the banner surface for banners", () => {
    const cover = resolveCover({ presetId: "rose-ripples", iconId: NO_ICON }, ctx);
    const { container } = render(<CoverArt cover={cover} variant="banner" />);
    const stops = Array.from(container.querySelectorAll("stop")).map((s) => s.getAttribute("stop-color"));
    expect(stops).toEqual([cover.palette.banner.from, cover.palette.banner.to]);
    expect(container.querySelector("svg")?.getAttribute("data-cover-icon")).toBe("none");
  });

  it("renders a glyph as text", () => {
    const cover = resolveCover({ presetId: "ember-tiles", iconId: "integral" }, ctx);
    const { container } = render(<CoverArt cover={cover} variant="card" />);
    expect(container.querySelector("text")?.textContent).toBe("∫");
  });

  it("gives every instance a unique gradient id", () => {
    const cover = resolveCover(null, ctx);
    const { container } = render(
      <>
        <CoverArt cover={cover} variant="card" />
        <CoverArt cover={cover} variant="banner" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("coverStyleVars", () => {
  it("exposes palette ink as CSS variables", () => {
    const cover = resolveCover({ presetId: "lavender-diamond", iconId: null }, ctx);
    const vars = coverStyleVars(cover, "card") as Record<string, string>;
    expect(vars["--cover-ink"]).toBe(cover.palette.card.ink);
    expect(vars["--cover-ink-muted"]).toBe(cover.palette.card.inkMuted);
    const bannerVars = coverStyleVars(cover, "banner") as Record<string, string>;
    expect(bannerVars["--cover-ink"]).toBe("#FFFFFF");
  });
});

describe("CoverPicker", () => {
  function setup(value: CoverSelection) {
    const onChange = vi.fn();
    render(<CoverPicker value={value} onChange={onChange} subjectName="A-Level Physics" previewTitle="A-Level Physics" />);
    return onChange;
  }

  it("changes colour but keeps the pattern and icon", () => {
    const onChange = setup({ presetId: "sky-orbit", iconId: "atom" });
    fireEvent.click(screen.getByRole("radio", { name: "Rose" }));
    expect(onChange).toHaveBeenCalledWith({ presetId: "rose-orbit", iconId: "atom" });
  });

  it("changes pattern but keeps the colour", () => {
    const onChange = setup({ presetId: "sky-orbit", iconId: "atom" });
    fireEvent.click(screen.getByRole("radio", { name: "Dots" }));
    expect(onChange).toHaveBeenCalledWith({ presetId: "sky-dots", iconId: "atom" });
  });

  it("selects no icon", () => {
    const onChange = setup({ presetId: "sky-orbit", iconId: "atom" });
    fireEvent.click(screen.getByRole("radio", { name: "None" }));
    expect(onChange).toHaveBeenCalledWith({ presetId: "sky-orbit", iconId: null });
  });

  it("suggests science icons for a physics class and filters by search", () => {
    setup({ presetId: "sky-orbit", iconId: null });
    expect(screen.getByText("Suggested for Science")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search icons" }), { target: { value: "guitar" } });
    expect(screen.getByRole("radio", { name: "Guitar" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Atom" })).toBeNull();
  });
});
