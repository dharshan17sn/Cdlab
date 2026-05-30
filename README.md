# Universal Dead Feature Detector

## Overview
The **Universal Dead Feature Detector** is an advanced static and dynamic analysis tool designed to identify dead, unused, or unreachable features in large-scale C/C++ codebases. By combining preprocessor macro analysis with LLVM-based whole-program reachability tracking, this tool securely identifies code blocks and features that are compiled or configured but never executed.

This tool aims to reduce technical debt, minimize binary size, and improve overall software maintainability by giving engineering teams high-confidence actionable insights regarding obsolete code.

## Key Features
- **Language Agnostic (C/C++)**: Compatible with any standard C/C++ repository.
- **Whole-Program Analysis**: Tracks reachability across the entire binary rather than just isolated files.
- **Zero-Configuration Execution**: Directly accepts Git URLs to clone, compile, and analyze automatically.
- **Dynamic Web Interface**: Provides real-time execution tracking and rich visual dashboards for reporting.
- **High-Confidence Metrics**: Computes exact Lines of Code (LOC) safe for removal and estimates binary reduction size.

## Architecture & Deliverables

This project directly fulfills the 5 core deliverables outlined for the **Dead Feature Detector for Large C/C++ Codebases** assignment:

1. **Build Configuration Extractor**: Parses build configurations (CMake/Makefile) and header files to enumerate actual `#define` combinations and discover which features are never actively configured.
2. **LLVM Whole-Program Analysis Pass**: A custom LLVM Compiler Pass that transforms the code into LLVM Intermediate Representation (IR) and performs whole-program reachability tracking, correlating configuration predicates with IR-level dead code blocks.
3. **Dead Feature Report Generation**: Produces a detailed JSON report and a visual UI breakdown of dead features, assigning them "High Confidence" scores and pinpointing the exact affected source code file and line-number regions (powered by the Preprocessor Guard Mapper).
4. **Large Open-Source Evaluation**: Includes an automated evaluation pipeline (`evaluate_redis.sh`) that clones, compiles, and evaluates massive real-world projects like Memcached or Redis on the fly.
5. **Code Volume & Impact Estimation**: Accurately computes the exact Lines of Code (LOC) safe for removal and estimates the immediate binary size reduction achieved by removing the dead features.

*(**Bonus Delivery**): We built an interactive Web Interface (React/Flask) that allows you to paste any Git URL and watch the pipeline execute live, complete with dynamically generated impact charts.*

---

## Prerequisites
- Linux / WSL (Ubuntu recommended)
- Python 3.8+ (with `python3-venv`)
- Node.js (v18+) & NPM
- LLVM 18 (`llvm-18`, `clang-18`)
- CMake & Make

---

## How to Run the Web Interface (Recommended)

The Web Interface provides the best user experience with live streaming and visual charts. It requires running the Backend Server and the Frontend UI simultaneously.

### 1. Start the Backend API
The backend requires a Python Virtual Environment to serve the analysis pipeline securely.

```bash
# Navigate to the project directory
cd redis_dead_feature_detector

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies and run the server
pip install flask flask-cors
python3 backend/app.py
```
*(The server will start on `http://localhost:3001`)*

### 2. Start the Frontend UI
Open a **new** terminal window (can be standard Windows or WSL).

```bash
# Navigate to the frontend directory
cd redis_dead_feature_detector/frontend

# Install dependencies and start the Vite dev server
npm install
npm run dev
```
*(The UI will open at `http://localhost:5173`. You can now enter any Git URL to begin the analysis).*

---

## How to Run on Terminal (CLI)

If you prefer to run the analysis directly from the command line without the web interface, you can use the evaluation script.

```bash
cd redis_dead_feature_detector

# Ensure the script is executable
chmod +x evaluation/evaluate_redis.sh

# Run the script and pass the target Git URL as an argument
./evaluation/evaluate_redis.sh "https://github.com/memcached/memcached.git"
```

---

## Testing & Validation

The project includes several isolated test cases designed to validate specific edge cases of the LLVM pass and guard mapper.

**Available Test Cases:**
- `tc1_simple_dead_code.c`: Basic unused functions.
- `tc2_macro_guard.c`: Code blocked by `#ifndef`.
- `tc3_dead_function.c`: Functions declared but never called.
- `tc4_alive_feature.c`: Control test ensuring active code is not flagged.
- `tc5_complex_reachability.c`: Deeply nested unreachable blocks.

**How to run a test case manually:**
```bash
cd redis_dead_feature_detector
./run.sh testcases/tc1_simple_dead_code.c
```
*The resulting JSON report will be generated in `src/dead_feature_reporter/dead_report.json`.*
