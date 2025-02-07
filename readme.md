# Scope Navigator

Explore source by descending to the top of a deeper scope, ascending to the top of a higher scope, or hopping to the top of the next/previous scope of the same depth.

## Explanation

These are vim-like motions that let you navigate the _scopes_ of a source file (specifically namespaces, structs, functions, control statements). The motions are descend, ascend, and hop to the next or previous branch. The following examples show this in action

In each one of the examples below, a `c0` marks the cursor location before the command and `c1` shows the cursor location after the command.

### Descend

```cpp
{
  //...
  {
    //...
  }
  c0
  {
    c1
  }
  //...
}
```

```cpp
{
  //...
  {
    //...
  }
  //...
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
  {
    //...
  }
}
```

```cpp
{
  c1
  {
    //...
  }
  {
    c0
  }
}
```

### Next Branch

```cpp
{
  {
    //...
  }
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
  {
    //...
  }
}
```

## Extension Settings

Set your preferred hotkeys for the following commands. My testing default are next to the setting names.

* `scope-navigator.descend` - `Ctrl+l`
* `scope-navigator.ascend` - `Ctrl+h`
* `scope-navigator.nextBranch` - `Ctrl+j`
* `scope-navigator.previousBranch` - `Ctrl+k`

## Deficiencies

This is purely text based, so it will only work with languages that use braces for defining scopes. This also means usages of braces that define things other than scopes will interfere with the intention of these commands. If I conclude that these motions are beneficial enough, I will look into making a solution that is more robust.
