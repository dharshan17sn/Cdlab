cmake_minimum_required(VERSION 3.20)
project(DeadFeaturePass C CXX)

set(CMAKE_CXX_STANDARD 17)

find_package(LLVM REQUIRED CONFIG)
include_directories(${LLVM_INCLUDE_DIRS})
add_definitions(${LLVM_DEFINITIONS})

add_library(DeadFeaturePass MODULE DeadFeaturePass.cpp)

if(APPLE)
  set_target_properties(DeadFeaturePass PROPERTIES LINK_FLAGS "-undefined dynamic_lookup")
endif()
