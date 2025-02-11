# Scope Navigator
Explore source by descending to the top of a deeper scope, ascending to the top of a higher scope, or hopping to the top of the next/previous scope of the same depth.

## Explanation
These are vim-like motions that let you navigate the _scopes_ of a source file (anything wrapped within `{\n` and `^ *}`). The motions are descend, ascend, and hop to the next or previous branch. The following examples show this in action

In each one of the examples below, a `c0` marks the cursor location before the command and `c1` shows the cursor location after the command.

### Descend
```cpp
{
  c0
  {
    c1
  }
  c0
}
```

### Ascend
```cpp
{
  c1
  {
    c0
  }
}
```

### Next Branch
```cpp
{
  {
    c0
  }
  {
    c1
  }
}
```

### Previous Branch
```cpp
{
  {
    c1
  }
  {
    c0
  }
}
```

Here is a video of these motions in action. The hotkey bindings being used can be found in the [Extension Settings](#extension-settings) section.

https://github.com/user-attachments/assets/109be152-1ee7-44d1-a5b0-7057947cb599

## Extension Settings
Set your preferred hotkeys for the following commands. The defaults I am testing with are next to the command names.

* `scope-navigator.descend` - `Ctrl+l`
* `scope-navigator.ascend` - `Ctrl+h`
* `scope-navigator.nextBranch` - `Ctrl+j`
* `scope-navigator.previousBranch` - `Ctrl+k`

## Deficiencies
This is purely text based, so its use case is limited to code that uses opening braces at the end of a line and closing braces at the start of a line. Braces that fall under these conditions and are found within comments are included. The implementation could also be a lot better.
