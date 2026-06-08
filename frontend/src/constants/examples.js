export const EXAMPLES = {
  custom: {
    name: "Write Your Own Code",
    category: "Custom Code",
    timeComplexity: "N/A",
    spaceComplexity: "N/A",
    description: "Write your custom Python script here and click Run Trace to generate interactive visualizations.",
    code: `# Write your own Python code here to visualize!
# You can define functions, classes, lists, or custom trees.
# Click "Run Trace" at the top right to execute and visualize.

def my_function(x):
    result = []
    for i in range(x):
        result.append(i * 2)
    return result

# Execute your function to see the trace
arr = my_function(5)
print("Result:", arr)
`
  },
  bubble_sort: {
    name: "Bubble Sort",
    category: "Sorting",
    timeComplexity: "O(N²)",
    spaceComplexity: "O(1)",
    description: "Iteratively compares adjacent elements and swaps them if they are in the wrong order. Ideal for visualizing nested loops, list swaps, and indexing.",
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                # Swap elements
                arr[j], arr[j+1] = arr[j+1], arr[j]

numbers = [5, 2, 9, 1, 5, 6]
bubble_sort(numbers)
print("Final Sorted Array:", numbers)
`
  },
  binary_search: {
    name: "Binary Search",
    category: "Searching",
    timeComplexity: "O(log N)",
    spaceComplexity: "O(1)",
    description: "Finds the position of a target value within a sorted array. Divides the search interval in half recursively to locate the element.",
    code: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    
    while low <= high:
        mid = (low + high) // 2
        val = arr[mid]
        if val == target:
            return mid
        elif val < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

items = [2, 5, 8, 12, 16, 23, 38, 56, 72]
target_val = 23
idx = binary_search(items, target_val)
print("Target found at index:", idx)
`
  },
  linked_list: {
    name: "Linked List",
    category: "Data Structures",
    timeComplexity: "O(N) traversal",
    spaceComplexity: "O(1) auxiliary",
    description: "A linear collection of data elements where each element points to the next. Visualizes custom objects created dynamically on the heap.",
    code: `class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None

# Initialize nodes
head = ListNode(10)
second = ListNode(20)
third = ListNode(30)

# Connect nodes
head.next = second
second.next = third

# Traverse the linked list
curr = head
while curr:
    print("Node value:", curr.val)
    curr = curr.next
`
  },
  stack: {
    name: "Stack (LIFO)",
    category: "Data Structures",
    timeComplexity: "O(1) push/pop",
    spaceComplexity: "O(N) capacity",
    description: "A Last-In, First-Out collection. Demonstrates list append() and pop() operations and tracks variables on a stack container.",
    code: `stack = []

# Push values
stack.append(10)
stack.append(20)
stack.append(30)
print("Stack contents:", stack)

# Pop values
top1 = stack.pop()
top2 = stack.pop()
print("Popped values:", top1, "and", top2)
print("Remaining stack:", stack)
`
  },
  queue: {
    name: "Queue (FIFO)",
    category: "Data Structures",
    timeComplexity: "O(1) enqueue/dequeue",
    spaceComplexity: "O(N) capacity",
    description: "A First-In, First-Out collection. Visualizes enqueues and dequeues using collections.deque and maps reference mutations in the heap.",
    code: `from collections import deque

queue = deque()

# Enqueue
queue.append("Job 1")
queue.append("Job 2")
queue.append("Job 3")
print("Queue:", list(queue))

# Dequeue
first_job = queue.popleft()
print("Processed:", first_job)
print("Queue queue:", list(queue))
`
  },
  dfs: {
    name: "Binary Tree DFS",
    category: "Trees",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(H) height",
    description: "Traverses a tree data structure recursively using Depth-First Search. Displays call stack frames compiling and popping as nodes are visited.",
    code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

# Build a binary tree
#       1
#      / \
#     2   3
#    /
#   4
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)

traversal_path = []

def dfs_inorder(node):
    if node is None:
        return
    dfs_inorder(node.left)
    traversal_path.append(node.val)
    dfs_inorder(node.right)

dfs_inorder(root)
print("Inorder Traversal Path:", traversal_path)
`
  },
  bfs: {
    name: "Binary Tree BFS",
    category: "Trees",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(W) width",
    description: "Traverses a tree data structure level-by-level using Breadth-First Search (Level Order). Visualizes traversal orders via queue container updates.",
    code: `from collections import deque

class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

# Build a binary tree
#       1
#      / \
#     2   3
#    / \
#   4   5
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)

level_order = []

def bfs_traversal(root_node):
    if not root_node:
        return
    
    # Store nodes in queue
    q = deque([root_node])
    
    while len(q) > 0:
        curr = q.popleft()
        level_order.append(curr.val)
        
        if curr.left:
            q.append(curr.left)
        if curr.right:
            q.append(curr.right)

bfs_traversal(root)
print("BFS Path:", level_order)
`
  },
  insertion_sort: {
    name: "Insertion Sort",
    category: "Sorting",
    timeComplexity: "O(N²)",
    spaceComplexity: "O(1)",
    description: "Iteratively builds a sorted list by inserting elements into their correct position. Great for comparative algorithm benchmarking.",
    code: `def insertion_sort(arr):
    n = len(arr)
    for i in range(1, n):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key

numbers = [5, 2, 9, 1, 5, 6]
insertion_sort(numbers)
print("Final Sorted Array:", numbers)
`
  }
};
