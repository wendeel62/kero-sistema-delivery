package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/alexbrainman/printer"
)

const (
	port        = "3002"
	readTimeout = 10 * time.Second
)

var startupTime = time.Now()

// ---------------------------------------------------------------------------
// CORS middleware - allow the PWA (any origin) to call us
// ---------------------------------------------------------------------------

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

type ErrorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, ErrorResponse{Error: msg})
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime"`
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().Format(time.RFC3339),
		Uptime:    time.Since(startupTime).Round(time.Second).String(),
	})
}

// ---------------------------------------------------------------------------
// GET /api/printers
// ---------------------------------------------------------------------------

type PrintersResponse struct {
	Printers []string `json:"printers"`
}

func handleListPrinters(w http.ResponseWriter, r *http.Request) {
	names, err := printer.ReadNames()
	if err != nil {
		log.Printf("[ERROR] Failed to list printers: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to enumerate printers: "+err.Error())
		return
	}

	if names == nil {
		names = []string{}
	}

	log.Printf("[INFO] Listed %d printer(s)", len(names))
	writeJSON(w, http.StatusOK, PrintersResponse{Printers: names})
}

// ---------------------------------------------------------------------------
// POST /api/print
// ---------------------------------------------------------------------------

type PrintRequest struct {
	Printer string `json:"printer"`
	Data    string `json:"data"`
}

type PrintResponse struct {
	Success  bool   `json:"success"`
	Printer  string `json:"printer"`
	Bytes    int    `json:"bytes"`
	Duration string `json:"duration"`
}

func handlePrint(w http.ResponseWriter, r *http.Request) {
	var req PrintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// Validate
	req.Printer = strings.TrimSpace(req.Printer)
	if req.Printer == "" {
		writeError(w, http.StatusBadRequest, "Field 'printer' is required")
		return
	}
	if req.Data == "" {
		writeError(w, http.StatusBadRequest, "Field 'data' is required")
		return
	}

	// Decode base64 → raw bytes
	raw, err := base64.StdEncoding.DecodeString(req.Data)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid base64 in field 'data': "+err.Error())
		return
	}

	start := time.Now()
	log.Printf("[INFO] Printing %d bytes to '%s'...", len(raw), req.Printer)

	// Open printer
	p, err := printer.Open(req.Printer)
	if err != nil {
		log.Printf("[ERROR] Cannot open printer '%s': %v", req.Printer, err)
		writeError(w, http.StatusInternalServerError, "Cannot open printer: "+err.Error())
		return
	}
	defer p.Close()

	// Start raw document
	if err := p.StartRawDocument("Kero Delivery"); err != nil {
		log.Printf("[ERROR] StartRawDocument failed: %v", err)
		writeError(w, http.StatusInternalServerError, "StartRawDocument failed: "+err.Error())
		return
	}

	// Write raw bytes
	written, err := p.Write(raw)
	if err != nil {
		log.Printf("[ERROR] Write failed after %d bytes: %v", written, err)
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("Write failed after %d bytes: %v", written, err))
		return
	}

	// End document
	if err := p.EndDocument(); err != nil {
		log.Printf("[WARN] EndDocument warning: %v", err)
	}

	duration := time.Since(start).Round(time.Millisecond).String()
	log.Printf("[OK] Printed %d bytes to '%s' in %s", written, req.Printer, duration)

	writeJSON(w, http.StatusOK, PrintResponse{
		Success:  true,
		Printer:  req.Printer,
		Bytes:    written,
		Duration: duration,
	})
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/api/printers", handleListPrinters)
	mux.HandleFunc("/api/print", handlePrint)

	server := &http.Server{
		Handler:      corsMiddleware(mux),
		ReadTimeout:  readTimeout,
		WriteTimeout: readTimeout,
	}

	listener, err := net.Listen("tcp", "127.0.0.1:"+port)
	if err != nil {
		log.Fatalf("[FATAL] Cannot bind to 127.0.0.1:%s: %v", port, err)
		os.Exit(1)
	}

	log.Printf("========================================")
	log.Printf("  Kero Printer Helper")
	log.Printf("  Listening on http://127.0.0.1:%s", port)
	log.Printf("  Endpoints:")
	log.Printf("    GET  /health        Health check")
	log.Printf("    GET  /api/printers   List Windows printers")
	log.Printf("    POST /api/print      Send raw data to printer")
	log.Printf("========================================")

	if err := server.Serve(listener); err != nil {
		log.Fatalf("[FATAL] Server error: %v", err)
	}
}
