#include <stdio.h>

void dead_helper() {
    printf("I help a dead function.\n");
}

void dead_main_func() {
    dead_helper();
}

int main() {
    printf("Main is alive.\n");
    return 0;
}
