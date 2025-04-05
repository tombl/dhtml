# UIBench Benchmark Specification

## Core Structure and Configuration

The benchmark consists of three main component types:
- **Table**: Data-intensive grid views with sortable/filterable content
- **Tree**: Hierarchical tree structures with various transformations
- **Animation**: Visual elements with time-based state changes

## Table Scenarios

### Data Structure
- `TableState`: Contains array of `TableItemState` objects
- `TableItemState`: Represents a row with:
  - `id`: Unique row identifier
  - `active`: Boolean indicating selection state
  - `props`: String array containing cell values

### Operations
1. **Render** (`table/[rows,cols]/render`)
   - Creates tables with specified rows/columns size
   - small: [15,2], [15,4], [30,2], [30,4]
   - large: [50,2], [50,4], [100,2], [100,4]

2. **Remove All** (`table/[rows,cols]/removeAll`)
   - Removes all rows from existing table
   - Tests empty state transition

3. **Sort By Column** (`table/[rows,cols]/sort/[col]`)
   - Sorts table by specified column index (0 or 1)
   - Lexicographically sorts using `localeCompare`

4. **Filter** (`table/[rows,cols]/filter/[nth]`)
   - Filters rows where (index+1) % nth !== 0
   - small thresholds: 2, 4, 8
   - large thresholds: 4, 8, 16, 32

5. **Activate** (`table/[rows,cols]/activate/[nth]`)
   - Sets `active=true` on every nth row
   - small intervals: 2, 4, 8
   - large intervals: 4, 8, 16, 32

## Animation Scenarios

### Data Structure
- `AnimState`: Contains array of `AnimBoxState` objects
- `AnimBoxState`: Represents an animated box with:
  - `id`: Unique identifier
  - `time`: Integer representing animation frame

### Operations
- **Advance Each** (`anim/[count]/[nth]`)
  - Advances animation time for every nth element
  - small: 30 elements with intervals 2, 4, 8
  - large: 100 elements with intervals 4, 8, 16, 32
  - Animation is visualized with `borderRadius` and `background` style changes

## Tree Scenarios

### Data Structure
- `TreeState`: Contains a root `TreeNodeState`
- `TreeNodeState`: Represents a node with:
  - `id`: Unique identifier
  - `container`: Boolean indicating if it's a container or leaf
  - `children`: Array of child nodes (null for leaf nodes)

### Hierarchy Specifications
- Hierarchies defined as number arrays where each number is child count at that depth
- small examples: [50], [5,10], [10,5], [10,10,10,2], [2,2,2,2,2,2,2,2,2]
- large examples: [500], [50,10], [10,50], [5,100], [10,10,10,10], [2,2,2,2,2,2,2,2,2,2]

### Operations
1. **Render** (`tree/[hierarchy]/render`)
   - Creates tree with specified hierarchy

2. **Remove All** (`tree/[hierarchy]/removeAll`)
   - Removes all nodes from existing tree

3. **Reverse** (`tree/[hierarchy]/[reverse]`)
   - Reverses order of children at each level

4. **Insert First** (`tree/[hierarchy]/[insertFirst(n)]`)
   - Inserts n new nodes at beginning of each container

5. **Insert Last** (`tree/[hierarchy]/[insertLast(n)]`)
   - Appends n new nodes at end of each container

6. **Remove First** (`tree/[hierarchy]/[removeFirst(n)]`)
   - Removes first n nodes from each container

7. **Remove Last** (`tree/[hierarchy]/[removeLast(n)]`)
   - Removes last n nodes from each container

8. **Move From End To Start** (`tree/[hierarchy]/[moveFromEndToStart(n)]`)
   - Moves n nodes from end to beginning of each container

9. **Move From Start To End** (`tree/[hierarchy]/[moveFromStartToEnd(n)]`)
   - Moves n nodes from beginning to end of each container

10. **No Change** (`tree/[hierarchy]/no_change`)
    - Tests performance with no structural changes (diffing overhead)

## Library-Specific Worst-Case Scenarios

1. **Kivi Worst Case** (`tree/[hierarchy]/[kivi_worst_case]`)
   - Sequence: removeFirst(1) → removeLast(1) → reverse

2. **Snabbdom Worst Case** (`tree/[hierarchy]/[snabbdom_worst_case]`)
   - Custom transformation: shifts first element and splices second-to-last element to end

3. **React Worst Case** (`tree/[hierarchy]/[react_worst_case]`)
   - Sequence: removeFirst(1) → removeLast(1) → moveFromEndToStart(1)

4. **Virtual DOM Worst Case** (`tree/[hierarchy]/[virtual_dom_worst_case]`)
   - Simple moveFromStartToEnd(2) operation

## Capability Tests

1. **Spec Test** (`specTest`)
   - Verifies implementation adheres to expected DOM structure
   - Checks proper class names, attributes, and event handling

2. **Should Component Update (SCU) Test** (`scuTest`)
   - Tests if framework supports SCU optimizations
   - Modifies property without re-rendering component

3. **DOM Recycling Test** (`recyclingTest`)
   - Tests if DOM nodes are reused when components re-render
   - Verifies element identity across renders

4. **Preserve State Test** (`preserveStateTest`)
   - Tests if component state is preserved across re-rendering
   - Attaches custom property and verifies preservation after DOM updates

## DOM Structure Requirements

1. Table components must render:
   - Container with class "Table"
   - Rows with class "TableRow" and data-id attribute
   - Cells with class "TableCell"
   - Active rows must have "active" class
   - First cell must contain "#[id]" content

2. Animation components must render:
   - Container with class "Anim"
   - Boxes with class "AnimBox" and data-id attribute
   - Styles must include borderRadius and background

3. Tree components must render:
   - Container with class "Tree"
   - Container nodes with class "TreeNode"
   - Leaf nodes with class "TreeLeaf" containing the node id as content

## Benchmark Execution Process
For each test case:
- Initialize with "start" state
- Transition to "mid" state
- Transition to "end" state
