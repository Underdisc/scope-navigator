import * as vscode from 'vscode';

type BraceInfo = {
  text: string; offset: number; depth: number;
};

function GetBraceInfo(
    document: vscode.TextDocument,
    cursorPosition: vscode.Position): [BraceInfo[], BraceInfo[]] {
  // Acquire braces before the cursor. If the cursor is on a '}', it is exluded.
  // A '{' is included.
  const beforeStart = document.positionAt(0);
  const cursorOffset = document.offsetAt(cursorPosition);
  const text = document.getText();
  let beforeEnd;
  if (text.charAt(cursorOffset) == '}') {
    beforeEnd = document.positionAt(cursorOffset);
  } else {
    beforeEnd = document.positionAt(cursorOffset + 1);
  }
  const beforeRange = new vscode.Range(beforeStart, beforeEnd);
  const beforeText = document.getText(beforeRange);
  const regex = /{|}/g
  const beforeMatches = Array.from(beforeText.matchAll(regex));
  const beforeMatchesReverse = Array.from(beforeMatches).reverse();
  let beforeBraces: BraceInfo[] = [];
  let depth = 0;
  for (const match of beforeMatchesReverse) {
    if (match[0] == '}') {
      depth += 1;
    }
    let newInfo:
        BraceInfo = {text: match[0], offset: match.index, depth: depth};
    beforeBraces.push(newInfo);
    if (match[0] == '{') {
      depth -= 1;
    }
  }

  // Acquire braces after the cursor. If the cursor is on a '{', it is exluded.
  // A '}' is included.
  let afterBeginOffset;
  if (text.charAt(cursorOffset) == '{') {
    afterBeginOffset = cursorOffset + 1;
  } else {
    afterBeginOffset = cursorOffset;
  }
  const afterBegin = document.positionAt(afterBeginOffset);
  const afterEnd = document.positionAt(text.length)
  const afterRange = new vscode.Range(afterBegin, afterEnd);
  const afterText = document.getText(afterRange);
  const afterMatches = afterText.matchAll(regex)
  let afterBraces: BraceInfo[] = [];
  depth = 0;
  for (const matchIt of afterMatches) {
    const match = matchIt;
    if (match[0] == '{') {
      depth += 1;
    }
    let newInfo: BraceInfo = {
      text: match[0],
      offset: afterBeginOffset + match.index,
      depth: depth
    };
    afterBraces.push(newInfo);
    if (match[0] == '}') {
      depth -= 1;
    }
  }
  return [beforeBraces, afterBraces];
}

function SetCursorPosition(editor: vscode.TextEditor, offset: number) {
  const bracePosition = editor.document.positionAt(offset);
  const newSelection = new vscode.Selection(bracePosition, bracePosition)
  editor.selection = newSelection;
  const range = new vscode.Range(bracePosition, bracePosition);
  editor.revealRange(range);
}

function Descend(
    editor: vscode.TextEditor, beforeBraces: BraceInfo[],
    afterBraces: BraceInfo[]) {
  for (const brace of afterBraces) {
    if (brace.depth == 0) {
      return;
    } else if (brace.depth == 1) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }

  let nextDepthCount = 0;
  for (const brace of beforeBraces) {
    if (brace.depth == 0) {
      return;
    } else if (brace.depth == 1) {
      ++nextDepthCount;
    }
    if (nextDepthCount == 2) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}

function Ascend(editor: vscode.TextEditor, beforeBraces: BraceInfo[]) {
  for (const brace of beforeBraces) {
    if (brace.depth == -1) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}

function NextBranch(editor: vscode.TextEditor, afterBraces: BraceInfo[]) {
  let currentDepthCount = 0;
  for (const brace of afterBraces) {
    if (brace.depth == -1) {
      return;
    } else if (brace.depth == 0) {
      ++currentDepthCount;
    }
    if (currentDepthCount == 2) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}


function PreviousBranch(editor: vscode.TextEditor, beforeBraces: BraceInfo[]) {
  let currentDepthCount = 0;
  for (const brace of beforeBraces) {
    if (brace.depth == -1) {
      return;
    } else if (brace.depth == 0) {
      ++currentDepthCount;
    }
    if (currentDepthCount == 3) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}

enum Motion {
  Descend,
  Ascend,
  NextBranch,
  PreviousBranch,
}

function Explore(motion: Motion) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  const currentPosition = editor.selection.active;
  const [beforeBraces, afterBraces] = GetBraceInfo(document, currentPosition);
  switch (motion) {
    case Motion.Descend:
      Descend(editor, beforeBraces, afterBraces);
      break;
    case Motion.Ascend:
      Ascend(editor, beforeBraces);
      break;
    case Motion.NextBranch:
      NextBranch(editor, afterBraces);
      break;
    case Motion.PreviousBranch:
      PreviousBranch(editor, beforeBraces);
      break;
  }
}

export function activate(context: vscode.ExtensionContext) {
  let subs = context.subscriptions;
  subs.push(vscode.commands.registerCommand(
      'scope-navigator.descend', () => {Explore(Motion.Descend)}));
  subs.push(vscode.commands.registerCommand(
      'scope-navigator.ascend', () => {Explore(Motion.Ascend)}));
  subs.push(vscode.commands.registerCommand(
      'scope-navigator.next-branch', () => {Explore(Motion.NextBranch)}));
  subs.push(vscode.commands.registerCommand(
      'scope-navigator.previous-branch',
      () => {Explore(Motion.PreviousBranch)}));
}