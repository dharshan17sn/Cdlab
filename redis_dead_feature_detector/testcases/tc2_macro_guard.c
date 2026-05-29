#include <stdio.h>

#ifdef FEATURE_OFF
void macro_guarded_func() {
    printf("This should be dead because FEATURE_OFF is not defined.\n");
}
#endif

int main() {
    printf("Main is alive.\n");
    return 0;
}
