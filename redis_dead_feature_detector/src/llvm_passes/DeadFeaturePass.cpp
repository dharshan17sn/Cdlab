#include "llvm/Passes/PassPlugin.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/IR/PassManager.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/Instructions.h"
#include "llvm/IR/DebugInfoMetadata.h"
#include "llvm/Support/raw_ostream.h"

#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <map>
#include <set>

using namespace llvm;

namespace {

struct LineRange {
    std::string file;
    unsigned start;
    unsigned end;
};

// Extremely naive JSON parser for our specific guard_map.json and config_status.json
std::vector<std::string> loadDeadConfigs(const std::string& path) {
    std::vector<std::string> dead;
    std::ifstream f(path);
    if (!f.is_open()) return dead;
    std::string content((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
    
    size_t deadStart = content.find("\"dead\": [");
    if (deadStart != std::string::npos) {
        size_t deadEnd = content.find("]", deadStart);
        std::string section = content.substr(deadStart, deadEnd - deadStart);
        size_t q1 = section.find("\"");
        while (q1 != std::string::npos) {
            size_t q2 = section.find("\"", q1 + 1);
            if (q2 != std::string::npos) {
                std::string flag = section.substr(q1 + 1, q2 - q1 - 1);
                if (flag != "dead") dead.push_back(flag);
                q1 = section.find("\"", q2 + 1);
            } else break;
        }
    }
    return dead;
}

// Parses guard_map.json
std::map<std::string, std::vector<LineRange>> loadGuardMap(const std::string& path) {
    std::map<std::string, std::vector<LineRange>> map;
    std::ifstream f(path);
    if (!f.is_open()) return map;
    
    std::string line;
    std::string currentFlag;
    while (std::getline(f, line)) {
        if (line.find("\": [") != std::string::npos) {
            size_t q1 = line.find("\"");
            size_t q2 = line.find("\"", q1 + 1);
            currentFlag = line.substr(q1 + 1, q2 - q1 - 1);
        } else if (line.find("\"file\":") != std::string::npos) {
            LineRange lr;
            size_t q1 = line.find("\"", line.find(":") + 1);
            size_t q2 = line.find("\"", q1 + 1);
            lr.file = line.substr(q1 + 1, q2 - q1 - 1);
            
            std::getline(f, line); // start
            size_t col1 = line.find(":") + 1;
            size_t com1 = line.find(",");
            lr.start = std::stoi(line.substr(col1, com1 - col1));
            
            std::getline(f, line); // end
            size_t col2 = line.find(":") + 1;
            lr.end = std::stoi(line.substr(col2));
            
            map[currentFlag].push_back(lr);
        }
    }
    return map;
}

struct DeadFeatureDetector : public PassInfoMixin<DeadFeatureDetector> {
    
    PreservedAnalyses run(Module &M, ModuleAnalysisManager &MAM) {
        errs() << "\n[LLVM PASS] Starting Whole-Program Reachability Analysis...\n";
        
        std::vector<std::string> deadFlags = loadDeadConfigs("../config_extractor/config_status.json");
        std::map<std::string, std::vector<LineRange>> guardMap = loadGuardMap("../guard_mapper/guard_map.json");
        
        errs() << "[LLVM PASS] Loaded " << deadFlags.size() << " dead flags.\n";
        
        // Build an optimized lookup for dead line ranges
        std::vector<std::pair<std::string, LineRange>> deadRanges;
        for (const auto& flag : deadFlags) {
            if (guardMap.count(flag)) {
                for (const auto& lr : guardMap[flag]) {
                    deadRanges.push_back({flag, lr});
                }
            }
        }
        
        std::set<BasicBlock*> deadBlocks;
        std::map<std::string, int> deadFlagCounts;
        std::set<Function*> allFunctions;
        std::set<Function*> liveCalledFunctions;
        
        int totalInstr = 0;
        int deadInstr = 0;

        for (Function &F : M) {
            if (!F.isDeclaration()) allFunctions.insert(&F);
            
            for (BasicBlock &BB : F) {
                totalInstr += BB.size();
                bool isBlockDead = false;
                std::string killerFlag = "";
                
                // Check if any instruction in this block falls into a dead range
                for (Instruction &I : BB) {
                    if (const DebugLoc &Loc = I.getDebugLoc()) {
                        std::string file = Loc->getFilename().str();
                        unsigned line = Loc->getLine();
                        
                        for (const auto& dr : deadRanges) {
                            if (file.find(dr.second.file) != std::string::npos || dr.second.file.find(file) != std::string::npos) {
                                if (line >= dr.second.start && line <= dr.second.end) {
                                    isBlockDead = true;
                                    killerFlag = dr.first;
                                    break;
                                }
                            }
                        }
                    }
                    if (isBlockDead) break;
                }
                
                if (isBlockDead) {
                    deadBlocks.insert(&BB);
                    deadFlagCounts[killerFlag]++;
                    deadInstr += BB.size();
                } else {
                    // If block is LIVE, record any function calls made from here
                    for (Instruction &I : BB) {
                        if (auto *Call = dyn_cast<CallInst>(&I)) {
                            if (Function *CalledF = Call->getCalledFunction()) {
                                liveCalledFunctions.insert(CalledF);
                            }
                        }
                    }
                }
            }
        }
        
        // Find dead functions (Functions that exist, but are never called from a LIVE block)
        // Note: main() is always live if it exists.
        std::set<Function*> deadFunctions;
        for (Function *F : allFunctions) {
            if (F->getName() != "main" && liveCalledFunctions.find(F) == liveCalledFunctions.end()) {
                // To avoid marking standard library stubs as dead if they are called dynamically,
                // we just use a basic heuristic here.
                if (F->hasLocalLinkage() || F->hasExactDefinition()) {
                    deadFunctions.insert(F);
                }
            }
        }
        
        // Output Report
        std::ofstream out("../dead_feature_reporter/dead_report.json");
        out << "{\n  \"stats\": {\n";
        out << "    \"total_instructions\": " << totalInstr << ",\n";
        out << "    \"dead_instructions\": " << deadInstr << ",\n";
        out << "    \"dead_functions\": " << deadFunctions.size() << "\n  },\n";
        out << "  \"dead_features\": [\n";
        
        bool first = true;
        for (const auto& flag : deadFlags) {
            if (deadFlagCounts[flag] > 0) {
                if (!first) out << ",\n";
                first = false;
                out << "    {\n      \"feature\": \"" << flag << "\",\n";
                out << "      \"blocks_removed\": " << deadFlagCounts[flag] << "\n    }";
            }
        }
        out << "\n  ]\n}\n";
        out.close();
        
        errs() << "[LLVM PASS] Analysis complete. Saved to dead_report.json.\n";
        return PreservedAnalyses::all();
    }
};

}

extern "C" ::llvm::PassPluginLibraryInfo LLVM_ATTRIBUTE_WEAK
llvmGetPassPluginInfo() {
    return {
        LLVM_PLUGIN_API_VERSION, "DeadFeatureDetector", "v1.0",
        [](PassBuilder &PB) {
            PB.registerPipelineParsingCallback(
                [](StringRef Name, ModulePassManager &MPM, ArrayRef<PassBuilder::PipelineElement>) {
                    if (Name == "dead-feature-detector") {
                        MPM.addPass(DeadFeatureDetector());
                        return true;
                    }
                    return false;
                });
        }
    };
}
