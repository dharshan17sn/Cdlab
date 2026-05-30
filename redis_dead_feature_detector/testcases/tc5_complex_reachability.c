#include <stdio.h>

void recursive_b();

void recursive_a() {
    printf("Recursive A\n");
    recursive_b();
}

void recursive_b() {
    printf("Recursive B\n");
    recursive_a();
}

void entry_point() {
    recursive_a();
}

int main() {
    printf("Main is alive, but the recursive cycle is dead.\n");
    // entry_point() is NOT called.
    return 0;
}
