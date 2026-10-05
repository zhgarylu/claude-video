def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


nums = [2, 5, 8, 12, 16, 23, 38]
for target in (16, 38, 7):
    print(target, binary_search(nums, target))
