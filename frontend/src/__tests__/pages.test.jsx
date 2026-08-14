import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

import Splash from "../pages/Splash";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import NotFound from "../pages/NotFound";
import Scan from "../pages/nutriscan/Scan";
import NutriScanHistory from "../pages/nutriscan/History";
import DailySummary from "../pages/nutriscan/DailySummary";
import Chat from "../pages/firstresponder/Chat";
import FirstResponderHistory from "../pages/firstresponder/History";

// Mock all backend calls so this is a pure rendering smoke test - no real
// network needed to prove the component trees mount without throwing.
vi.mock("../api/client", () => ({
  auth: { signup: vi.fn(), login: vi.fn() },
  nutriscan: {
    analyze: vi.fn(),
    analyzeLabel: vi.fn(),
    log: vi.fn(),
    history: vi.fn().mockResolvedValue([]),
    dailySummary: vi.fn().mockResolvedValue({
      date: "2026-01-01",
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
      total_sugar_g: 0,
      total_sodium_mg: 0,
      total_fiber_g: 0,
      entry_count: 0,
    }),
    deleteEntry: vi.fn(),
  },
  firstResponder: { chat: vi.fn(), history: vi.fn().mockResolvedValue([]) },
  hospitalSelector: { nearest: vi.fn() },
  getToken: vi.fn(() => null),
  getStoredUser: vi.fn(() => ({ userId: "1", username: "test_user" })),
  storeSession: vi.fn(),
  clearSession: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(status, detail) {
      super(detail);
      this.status = status;
    }
  },
}));

function renderPage(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("First Responder emergency action bar (the critical behavior)", () => {
  beforeEach(async () => {
    // Reset only the mock this describe block drives per-test (chat's queued
    // responses), while leaving history()'s default empty-array resolver
    // (set at vi.mock() factory time) intact for the other test suite below.
    const { firstResponder } = await import("../api/client");
    firstResponder.chat.mockReset();
    firstResponder.history.mockResolvedValue([]);
  });

  it("shows Call 112 + Navigate when is_emergency is true, and they persist across turns", async () => {
    const { firstResponder } = await import("../api/client");
    const user = userEvent.setup();

    firstResponder.chat
      .mockResolvedValueOnce({
        reply: "Step 1 of 7: Ask if they can cough.",
        is_emergency: true,
        scenario: "choking",
        step: 1,
        media_url: null,
        media_type: null,
        is_handover_summary: false,
      })
      .mockResolvedValueOnce({
        reply: "Step 2 of 7: Give 5 back blows.",
        is_emergency: true,
        scenario: "choking",
        step: 2,
        media_url: null,
        media_type: null,
        is_handover_summary: false,
      });

    renderPage(<Chat />);
    await waitFor(() => expect(screen.getByText(/Hi, I'm Jeeva/i)).toBeTruthy());

    const input = screen.getByPlaceholderText(/Tell me what's happening/i);
    await user.type(input, "someone is choking{Enter}");

    await waitFor(() => expect(screen.getByText(/Call 112/i)).toBeTruthy());
    expect(screen.getByText(/Navigate/i)).toBeTruthy();
    // Chat input must still be present and enabled - the chat never closes
    expect(screen.getByPlaceholderText(/Tell me what's happening/i).disabled).toBe(false);

    // Second turn: action bar must still be there, updated to step 2, not gone
    const input2 = screen.getByPlaceholderText(/Tell me what's happening/i);
    await user.type(input2, "done, next{Enter}");

    await waitFor(() => expect(screen.getByText("Step 2 of 7: Give 5 back blows.")).toBeTruthy());
    expect(screen.getByText(/Call 112/i)).toBeTruthy();
    expect(screen.getByText(/Navigate/i)).toBeTruthy();
  });

  it("removes the action bar once a handover summary arrives", async () => {
    const { firstResponder } = await import("../api/client");
    const user = userEvent.setup();

    firstResponder.chat
      .mockResolvedValueOnce({
        reply: "Step 1 of 7: Ask if they can cough.",
        is_emergency: true,
        scenario: "choking",
        step: 1,
        is_handover_summary: false,
      })
      .mockResolvedValueOnce({
        reply: "- Incident: Choking\n- Condition: Conscious",
        is_emergency: false,
        scenario: null,
        step: null,
        is_handover_summary: true,
      });

    renderPage(<Chat />);
    await waitFor(() => expect(screen.getByText(/Hi, I'm Jeeva/i)).toBeTruthy());

    const input = screen.getByPlaceholderText(/Tell me what's happening/i);
    await user.type(input, "someone is choking{Enter}");
    await waitFor(() => expect(screen.getByText(/Call 112/i)).toBeTruthy());

    const input2 = screen.getByPlaceholderText(/Tell me what's happening/i);
    await user.type(input2, "the ambulance arrived{Enter}");

    await waitFor(() => expect(screen.getByText("Help Has Arrived")).toBeTruthy());
    // Action bar must be gone now
    expect(screen.queryByText(/Call 112/i)).toBeNull();
    // Chat must still be usable
    expect(screen.getByPlaceholderText(/Tell me what's happening/i).disabled).toBe(false);
  });
});

describe("Every page renders without throwing", () => {
  it("Splash", () => {
    renderPage(<Splash />);
    expect(screen.getByText(/Log In/i)).toBeTruthy();
  });

  it("Login", () => {
    renderPage(<Login />);
    expect(screen.getByRole("button", { name: /Log In/i })).toBeTruthy();
  });

  it("SignUp", () => {
    renderPage(<SignUp />);
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeTruthy();
  });

  it("Home", async () => {
    renderPage(<Home />);
    await waitFor(() => expect(screen.getByText(/Hi, test_user/i)).toBeTruthy());
    expect(screen.getByText("NutriScan")).toBeTruthy();
    expect(screen.getByText("First Responder")).toBeTruthy();
  });

  it("Profile", () => {
    renderPage(<Profile />);
    expect(screen.getByText("Log Out")).toBeTruthy();
  });

  it("NotFound", () => {
    renderPage(<NotFound />);
    expect(screen.getByText(/Page not found/i)).toBeTruthy();
  });

  it("NutriScan Scan (mode select stage)", () => {
    renderPage(<Scan />);
    expect(screen.getByText("Scan a Meal")).toBeTruthy();
    expect(screen.getByText("Scan a Label")).toBeTruthy();
  });

  it("NutriScan History (empty state)", async () => {
    renderPage(<NutriScanHistory />);
    await waitFor(() => expect(screen.getByText(/Nothing logged yet today/i)).toBeTruthy());
  });

  it("NutriScan DailySummary", async () => {
    renderPage(<DailySummary />);
    await waitFor(() => expect(screen.getByText("Daily Summary")).toBeTruthy());
  });

  it("First Responder Chat (welcome state)", async () => {
    renderPage(<Chat />);
    await waitFor(() => expect(screen.getByText(/Hi, I'm Jeeva/i)).toBeTruthy());
    expect(screen.getByText("Someone is choking")).toBeTruthy();
  });

  it("First Responder History (empty state)", async () => {
    renderPage(<FirstResponderHistory />);
    await waitFor(() => expect(screen.getByText(/No conversations yet/i)).toBeTruthy());
  });
});
