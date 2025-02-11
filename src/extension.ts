import * as vscode from 'vscode';

type BraceInfo = {
  offset: number; depth: number; opening: boolean;
};

type CursorInfo = {
  nextBrace: number; depth: number;
};

function GetMotionInfo(
    document: vscode.TextDocument,
    cursorPosition: vscode.Position): [BraceInfo[], CursorInfo] {
  // Find all of the relevant braces contained in the file.
  const regex = /{\n|^ *}/gm
  const text = document.getText()
  const matches = text.matchAll(regex);
  let depth = 0;
  let braces: BraceInfo[] = [];
  for (const match of matches) {
    let matchString = match[0];
    let openIndex = matchString.indexOf('{');
    let closeIndex = matchString.indexOf('}');
    if (closeIndex != -1) {
      const offset = match.index + closeIndex;
      let newInfo: BraceInfo = {
        offset: offset,
        depth: depth,
        opening: false,
      };
      braces.push(newInfo);
      --depth;
    }
    if (openIndex != -1) {
      ++depth;
      const offset = match.index + openIndex;
      let newInfo: BraceInfo = {
        offset: offset,
        depth: depth,
        opening: true,
      };
      braces.push(newInfo);
    }
  }

  // Find the cursor's location relative to the collected braces.
  const cursorOffset = document.offsetAt(cursorPosition);
  if (braces.length == 0 || cursorOffset < braces[0].offset) {
    return [braces, {nextBrace: 0, depth: 0}];
  }
  for (let i = 0; i < braces.length - 1; ++i) {
    const brace = braces[i];
    const nextBrace = braces[i + 1];
    const afterBrace = (brace.opening && cursorOffset >= brace.offset) ||
        (!brace.opening && cursorOffset > brace.offset);
    const beforeNextBrace =
        (nextBrace.opening && cursorOffset < nextBrace.offset) ||
        (!nextBrace.opening && cursorOffset <= nextBrace.offset);
    const between = afterBrace && beforeNextBrace;
    if (!between) {
      continue;
    }
    if (brace.opening) {
      return [braces, {nextBrace: i + 1, depth: brace.depth}];
    } else {
      return [braces, {nextBrace: i + 1, depth: brace.depth - 1}];
    }
  }
  const cursorInfo: CursorInfo = {nextBrace: braces.length, depth: 0};
  return [braces, cursorInfo];
}

function SetCursorPosition(editor: vscode.TextEditor, offset: number) {
  const bracePosition = editor.document.positionAt(offset);
  const newSelection = new vscode.Selection(bracePosition, bracePosition)
  editor.selection = newSelection;
  const range = new vscode.Range(bracePosition, bracePosition);
  editor.revealRange(range);
}

function Descend(
    editor: vscode.TextEditor, braces: BraceInfo[], cursorInfo: CursorInfo) {
  if (cursorInfo.nextBrace < braces.length &&
      braces[cursorInfo.nextBrace].depth > cursorInfo.depth) {
    SetCursorPosition(editor, braces[cursorInfo.nextBrace].offset);
    return;
  }
  for (let i = cursorInfo.nextBrace - 2; i >= 0; --i) {
    const brace = braces[i];
    if (brace.opening) {
      if (brace.depth == cursorInfo.depth) {
        return;
      }
      if (brace.depth == cursorInfo.depth + 1) {
        SetCursorPosition(editor, brace.offset);
        return;
      }
    }
  }
}

function Ascend(
    editor: vscode.TextEditor, braces: BraceInfo[], cursorInfo: CursorInfo) {
  for (let i = cursorInfo.nextBrace - 1; i >= 0; --i) {
    const brace = braces[i];
    if (brace.depth == cursorInfo.depth - 1 && brace.opening) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}

function NextBranch(
    editor: vscode.TextEditor, braces: BraceInfo[], cursorInfo: CursorInfo) {
  for (let i = cursorInfo.nextBrace; i < braces.length; ++i) {
    const brace = braces[i];
    if (brace.depth < cursorInfo.depth) {
      return;
    }
    if (brace.depth == cursorInfo.depth && brace.opening) {
      SetCursorPosition(editor, brace.offset);
      return;
    }
  }
}

function PreviousBranch(
    editor: vscode.TextEditor, braces: BraceInfo[], cursorInfo: CursorInfo) {
  let currentScopeOpeningEcountered = false;
  for (let i = cursorInfo.nextBrace - 1; i >= 0; --i) {
    const brace = braces[i];
    if (brace.depth < cursorInfo.depth) {
      return;
    }
    if (brace.depth == cursorInfo.depth && brace.opening) {
      if (!currentScopeOpeningEcountered) {
        currentScopeOpeningEcountered = true;
        continue;
      }
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
  const [braces, cursorInfo] = GetMotionInfo(document, currentPosition);
  console.log(braces, cursorInfo);
  switch (motion) {
    case Motion.Descend:
      Descend(editor, braces, cursorInfo);
      break;
    case Motion.Ascend:
      Ascend(editor, braces, cursorInfo);
      break;
    case Motion.NextBranch:
      NextBranch(editor, braces, cursorInfo);
      break;
    case Motion.PreviousBranch:
      PreviousBranch(editor, braces, cursorInfo);
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