/* Sample C++ project files for testing ConfigAware
   Save these files and upload them to the dashboard */

/* ---- features.h ---- */
const SAMPLE_FILES = {

"features.h": `
#pragma once

// Feature flags — edit these to control build features
#define ENABLE_VULKAN          1
#define ENABLE_OLD_RENDERER    0   // LEGACY: replaced by Vulkan
#define FEATURE_LEGACY_AUTH    1   // LEGACY: deprecated, use OAuth2
#define FEATURE_OAUTH2         1
#define FEATURE_OAUTH1         0   // LEGACY: deprecated
#define USE_DEPRECATED_SOCKET  1   // LEGACY: sock_v1
#define USE_ASYNC_NET          1
#define FEATURE_TELEMETRY_V1   1   // LEGACY: old telemetry
#define ENABLE_TELEMETRY_V2    1
#define DEBUG_PRINT_VERBOSE    0   // debug-only, never in release
#define USE_OLD_JSON_PARSER    1   // LEGACY: slow v1 parser
#define EXPERIMENTAL_AI        0   // NOT READY
#define ENABLE_COMPAT_LAYER    0   // LEGACY: compatibility bridge
#define USE_SIMD_OPT           1
#define ENABLE_CACHE_LAYER     1
`,

"main.cpp": `
#include "features.h"
#include <iostream>

int main() {
#ifdef ENABLE_VULKAN
    std::cout << "Vulkan renderer active" << std::endl;
#endif

#ifdef ENABLE_OLD_RENDERER
    // DEAD: old_renderer_init();
    legacy_gl_start();
#endif

#ifdef FEATURE_OAUTH2
    auth_oauth2_init();
#endif

#ifdef FEATURE_LEGACY_AUTH
    // DEAD CODE BLOCK
    legacy_auth_start();
#endif

    return 0;
}
`,

"auth_legacy.cpp": `
#include "features.h"

#ifdef FEATURE_LEGACY_AUTH
void legacy_auth_start() {
    // This entire block is DEAD — FEATURE_LEGACY_AUTH never toggled live
    connect_old_auth_server();
    validate_legacy_token();
}
#endif

#ifdef FEATURE_OAUTH1
void oauth1_flow() {
    // DEAD — OAuth1 deprecated
    oauth1_sign_request();
}
#endif
`,

"CMakeLists.txt": `
cmake_minimum_required(VERSION 3.20)
project(MyLargeApp CXX)

set(CMAKE_CXX_STANDARD 17)

option(ENABLE_VULKAN       "Use Vulkan renderer"      ON)
option(FEATURE_LEGACY_AUTH "Enable legacy auth"        OFF)
option(DEBUG_PRINT_VERBOSE "Verbose debug printing"   OFF)
option(EXPERIMENTAL_AI     "Experimental AI features" OFF)

add_definitions(-DENABLE_VULKAN=1)
add_definitions(-DFEATURE_LEGACY_AUTH=0)
add_definitions(-DUSE_ASYNC_NET=1)
add_definitions(-DENABLE_TELEMETRY_V2=1)

add_executable(MyLargeApp
    src/main.cpp
    src/auth/legacy.cpp
    src/net/sock_v1.cpp
    src/render/gl_legacy.cpp
)
`
};

/* Export as downloadable files */
function downloadSampleFile(name) {
  const content = SAMPLE_FILES[name];
  if (!content) return;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

window.SAMPLE_FILES = SAMPLE_FILES;
window.downloadSampleFile = downloadSampleFile;
