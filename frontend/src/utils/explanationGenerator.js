import { resolveValueString } from "../components/VariableList";

export function generateExplanation(currentStepData, nextStepData, prevStepData, codeLines, heap) {
  if (!currentStepData || !codeLines) {
    return {
      lineCode: "",
      explanation: "No execution trace active.",
      variablesInvolved: [],
      changes: "Start execution to see changes."
    };
  }

  const lineNum = currentStepData.line;
  const lineCode = codeLines[lineNum - 1] ? codeLines[lineNum - 1].trim() : "";
  
  // Get active scope variables
  const scopes = currentStepData.scopes || [];
  const activeScope = scopes[scopes.length - 1] || {};
  const variables = activeScope.variables || {};

  // Get previous scope variables to compute changes
  const prevScopes = prevStepData?.scopes || [];
  const prevActiveScope = prevScopes[prevScopes.length - 1] || {};
  const prevVariables = prevActiveScope.variables || {};

  // Get next scope variables to compute what changes after this step
  const nextScopes = nextStepData?.scopes || [];
  const nextActiveScope = nextScopes[nextScopes.length - 1] || {};
  const nextVariables = nextActiveScope.variables || {};

  let explanation = "";
  let changes = "No variables changed in this step.";
  const variablesInvolved = [];

  // Helper to extract variables involved based on identifiers in the lineCode
  const words = lineCode.split(/[^a-zA-Z0-9_]/);
  const foundVars = new Set();
  words.forEach(w => {
    if (w && w in variables) {
      foundVars.add(w);
    }
  });

  foundVars.forEach(vName => {
    variablesInvolved.push({
      name: vName,
      value: resolveValueString(variables[vName], heap)
    });
  });

  // Calculate changes that happen after this step
  const changedVars = [];
  Object.keys(nextVariables).forEach(key => {
    const nextVal = nextVariables[key];
    const currVal = variables[key];
    if (!(key in variables) || JSON.stringify(nextVal) !== JSON.stringify(currVal)) {
      changedVars.push({
        name: key,
        oldVal: key in variables ? resolveValueString(currVal, heap) : undefined,
        newVal: resolveValueString(nextVal, heap)
      });
    }
  });

  // Also check stdout changes
  const currStdout = currentStepData.stdout || "";
  const nextStdout = nextStepData?.stdout || "";
  const stdoutAdded = nextStdout.slice(currStdout.length);

  if (changedVars.length > 0) {
    changes = changedVars.map(c => {
      if (c.oldVal === undefined) {
        return `Variable '${c.name}' is created with value ${c.newVal}.`;
      }
      return `Variable '${c.name}' updates from ${c.oldVal} to ${c.newVal}.`;
    }).join(" ");
  } else if (stdoutAdded) {
    changes = `Prints "${stdoutAdded.replace(/\n$/, "")}" to the console terminal.`;
  }

  // Heuristic-based explanation generator
  // 1. Bubble Sort Heuristics
  if (lineCode.startsWith("def bubble_sort")) {
    explanation = "Defining the Bubble Sort function which sorts an array in-place by comparing adjacent elements.";
  } else if (lineCode.includes("range(n)") && lineCode.includes("for i")) {
    const iVal = variables.i !== undefined ? variables.i : 0;
    explanation = `Outer loop pass i = ${iVal}. The algorithm will bubble the next largest element to its sorted position at the end.`;
  } else if (lineCode.includes("range(0, n-i-1)") && lineCode.includes("for j")) {
    const jVal = variables.j !== undefined ? variables.j : 0;
    explanation = `Inner loop index j = ${jVal}. Comparing adjacent elements from index 0 to the end of the unsorted section.`;
  } else if (lineCode.includes("arr[j] > arr[j+1]")) {
    // Look up array and elements
    const jVal = variables.j;
    const arrVal = variables.arr;
    if (arrVal && typeof jVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const val1 = resolveValueString(arrHeap[jVal], heap);
      const val2 = resolveValueString(arrHeap[jVal + 1], heap);
      const condition = Number(val1) > Number(val2);
      explanation = `Comparing arr[${jVal}] (${val1}) with arr[${jVal + 1}] (${val2}). Since ${val1} ${condition ? "is" : "is not"} greater than ${val2}, they ${condition ? "will" : "will not"} be swapped.`;
    } else {
      explanation = "Comparing adjacent elements arr[j] and arr[j+1] to check if they are out of order.";
    }
  } else if (lineCode.includes("arr[j], arr[j+1] = arr[j+1], arr[j]")) {
    const jVal = variables.j;
    const arrVal = variables.arr;
    if (arrVal && typeof jVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const val1 = resolveValueString(arrHeap[jVal], heap);
      const val2 = resolveValueString(arrHeap[jVal + 1], heap);
      explanation = `Swapping adjacent elements arr[${jVal}] (${val1}) and arr[${jVal + 1}] (${val2}) because they are in the wrong order.`;
    } else {
      explanation = "Swapping adjacent elements arr[j] and arr[j+1] since they are out of order.";
    }
  } 
  
  // 2. Binary Search Heuristics
  else if (lineCode.startsWith("def binary_search")) {
    explanation = "Defining the Binary Search function to find a target value inside a sorted list in logarithmic time.";
  } else if (lineCode.startsWith("low = 0")) {
    explanation = "Initializing search range lower bound index `low` to 0.";
  } else if (lineCode.includes("len(arr) - 1") && lineCode.startsWith("high =")) {
    explanation = "Initializing search range upper bound index `high` to the last element of the list.";
  } else if (lineCode.includes("while low <= high")) {
    const lowVal = variables.low;
    const highVal = variables.high;
    const isValid = lowVal <= highVal;
    explanation = `Checking if the search bounds are still valid (low <= high). Current range: [${lowVal}, ${highVal}] (${isValid ? "valid" : "empty"}).`;
  } else if (lineCode.includes("mid = (low + high)")) {
    const lowVal = variables.low;
    const highVal = variables.high;
    const midVal = Math.floor((lowVal + highVal) / 2);
    explanation = `Calculating midpoint mid = (${lowVal} + ${highVal}) // 2 = ${midVal}. This splits the remaining search space in half.`;
  } else if (lineCode.includes("val = arr[mid]")) {
    const midVal = variables.mid;
    const arrVal = variables.arr;
    if (arrVal && typeof midVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const val = resolveValueString(arrHeap[midVal], heap);
      explanation = `Reading value at index mid = ${midVal}. Value is arr[${midVal}] = ${val}.`;
    } else {
      explanation = "Reading the value at index mid of the array.";
    }
  } else if (lineCode.includes("val == target")) {
    const val = variables.val;
    const target = variables.target;
    const isEqual = val === target;
    explanation = `Comparing mid value (${val}) with target (${target}). Since they ${isEqual ? "are" : "are not"} equal, the target ${isEqual ? "has" : "has not"} been found.`;
  } else if (lineCode.includes("val < target")) {
    const val = variables.val;
    const target = variables.target;
    const isLess = val < target;
    explanation = `Checking if mid value (${val}) is less than target (${target}). Since ${val} < ${target} is ${isLess ? "True" : "False"}, the target ${isLess ? "is in the right half" : "is in the left half"}.`;
  } else if (lineCode.includes("low = mid + 1")) {
    const midVal = variables.mid;
    explanation = `Updating lower bound low to mid + 1 = ${midVal + 1}. The left half (including index ${midVal}) is discarded.`;
  } else if (lineCode.includes("high = mid - 1")) {
    const midVal = variables.mid;
    explanation = `Updating upper bound high to mid - 1 = ${midVal - 1}. The right half (including index ${midVal}) is discarded.`;
  }
  
  // 3. Insertion Sort Heuristics
  else if (lineCode.startsWith("def insertion_sort")) {
    explanation = "Defining the Insertion Sort function which iterates through an array, inserting each element into its sorted position.";
  } else if (lineCode.includes("range(1, n)") && lineCode.includes("for i")) {
    const iVal = variables.i !== undefined ? variables.i : 1;
    explanation = `Outer loop pass i = ${iVal}. Processing element at index ${iVal} to insert it into the sorted subarray on the left.`;
  } else if (lineCode.includes("key = arr[i]")) {
    const iVal = variables.i;
    const arrVal = variables.arr;
    if (arrVal && typeof iVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const keyVal = resolveValueString(arrHeap[iVal], heap);
      explanation = `Storing the element to be inserted: key = arr[${iVal}] = ${keyVal}.`;
    } else {
      explanation = "Storing the element at index i in a key variable.";
    }
  } else if (lineCode.startsWith("j = i - 1")) {
    const iVal = variables.i;
    explanation = `Initializing j = i - 1 = ${iVal - 1}. We will compare key with elements to its left starting from index ${iVal - 1}.`;
  } else if (lineCode.includes("while j >= 0 and arr[j] > key")) {
    const jVal = variables.j;
    const keyVal = variables.key;
    const arrVal = variables.arr;
    if (arrVal && typeof jVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const val = resolveValueString(arrHeap[jVal], heap);
      const isGreater = Number(val) > Number(keyVal);
      explanation = `Checking loop condition: j (${jVal}) >= 0 and arr[j] (${val}) > key (${keyVal}). Since this is ${jVal >= 0 && isGreater ? "True" : "False"}, we ${jVal >= 0 && isGreater ? "will shift arr[j] to the right" : "will exit loop and insert key"}.`;
    } else {
      explanation = "Checking if we should shift the element at index j to the right.";
    }
  } else if (lineCode.includes("arr[j + 1] = arr[j]")) {
    const jVal = variables.j;
    const arrVal = variables.arr;
    if (arrVal && typeof jVal === "number") {
      const arrHeap = heap[arrVal.id]?.value || [];
      const val = resolveValueString(arrHeap[jVal], heap);
      explanation = `Shifting arr[${jVal}] (${val}) one position to the right (to index ${jVal + 1}).`;
    } else {
      explanation = "Shifting the element at index j to the right.";
    }
  } else if (lineCode.includes("j -= 1")) {
    const jVal = variables.j;
    explanation = `Decrementing pointer j to ${jVal - 1} to inspect the next element to the left.`;
  } else if (lineCode.includes("arr[j + 1] = key")) {
    const jVal = variables.j;
    const keyVal = variables.key;
    explanation = `Inserting key (${keyVal}) into its sorted position at index j + 1 = ${jVal + 1}.`;
  }

  // 4. Linked List Heuristics
  else if (lineCode.includes("ListNode") && lineCode.includes("__init__")) {
    explanation = "Defining the ListNode class representing a single element in a Linked List.";
  } else if (lineCode.includes("ListNode(") && lineCode.includes("head =")) {
    explanation = "Creating the head node of the linked list on the heap with value 10.";
  } else if (lineCode.includes("ListNode(") && lineCode.includes("second =")) {
    explanation = "Creating a new node on the heap with value 20.";
  } else if (lineCode.includes("ListNode(") && lineCode.includes("third =")) {
    explanation = "Creating a new node on the heap with value 30.";
  } else if (lineCode.includes("head.next = second")) {
    explanation = "Connecting the head node (10) to point to the second node (20) using head.next.";
  } else if (lineCode.includes("second.next = third")) {
    explanation = "Connecting the second node (20) to point to the third node (30) using second.next.";
  } else if (lineCode.includes("curr = head")) {
    explanation = "Setting pointer `curr` to point to the head node (10) to start traversal.";
  } else if (lineCode.includes("while curr:")) {
    const currVal = variables.curr;
    const isNotNull = currVal !== null;
    explanation = `Checking if pointer curr is not None. Current node is ${isNotNull ? `Node(${resolveValueString(currVal, heap)})` : "None"}.`;
  } else if (lineCode.includes("curr = curr.next")) {
    const currVal = variables.curr;
    let nextNodeVal = "None";
    if (currVal && typeof currVal === "object" && currVal.type === "ref") {
      const nodeObj = heap[currVal.id];
      if (nodeObj && nodeObj.value?.next) {
        nextNodeVal = resolveValueString(nodeObj.value.next, heap);
      }
    }
    explanation = `Advancing the pointer curr to the next node in the list (${nextNodeVal}).`;
  }

  // General Fallbacks
  if (!explanation) {
    if (lineCode.startsWith("def ")) {
      explanation = `Defining function "${lineCode.split("(")[0].replace("def ", "")}".`;
    } else if (lineCode.startsWith("class ")) {
      explanation = `Defining class "${lineCode.split(":")[0].replace("class ", "")}".`;
    } else if (lineCode.startsWith("if ") || lineCode.startsWith("elif ")) {
      explanation = `Evaluating condition check: "${lineCode.replace(":", "")}".`;
    } else if (lineCode.startsWith("while ")) {
      explanation = `Evaluating loop condition: "${lineCode.replace(":", "")}".`;
    } else if (lineCode.startsWith("for ")) {
      explanation = `Iterating loop: "${lineCode.replace(":", "")}".`;
    } else if (lineCode.startsWith("return ")) {
      explanation = `Returning value from current function context.`;
    } else if (lineCode.includes("print(")) {
      explanation = `Printing output value to the stdout stream.`;
    } else if (lineCode) {
      explanation = `Executing line: "${lineCode}"`;
    } else {
      explanation = "No operation or comment step.";
    }
  }

  return {
    lineCode,
    explanation,
    variablesInvolved,
    changes
  };
}
