#include <stdio.h>

void feature_a() {
    printf("Feature A is alive.\n");
}

void feature_b() {
    printf("Feature B is alive.\n");
}

int main(int argc, char** argv) {
    if (argc > 1) {
        feature_a();
    } else {
        feature_b();
    }
    return 0;
}
