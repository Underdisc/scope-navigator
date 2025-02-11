import * as vscode from 'vscode';

type BraceInfo = {
  offset: number; newCursorOffset: number; depth: number; opening: boolean;
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
        newCursorOffset: -1,
        depth: depth,
        opening: false,
      };
      braces.push(newInfo);
      --depth;
    }
    if (openIndex != -1) {
      ++depth;
      const offset = match.index + openIndex;

      // Find next non-whitespace character after the opening brace for the new
      // cursor position.
      const endWhitespaceRegex = /\S/g;
      endWhitespaceRegex.lastIndex = offset + 1;
      const endWhitespaceMatch = endWhitespaceRegex.exec(text);
      let newCursorOffset = -1;
      if (endWhitespaceMatch) {
        newCursorOffset = endWhitespaceMatch.index;
      }

      let newInfo: BraceInfo = {
        offset: offset,
        newCursorOffset: newCursorOffset,
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

function SetCursorBrace(editor: vscode.TextEditor, brace: BraceInfo) {
  if (brace.newCursorOffset == -1) {
    return;
  }
  const bracePosition = editor.document.positionAt(brace.newCursorOffset);
  const newSelection = new vscode.Selection(bracePosition, bracePosition)
  editor.selection = newSelection;
  const range = new vscode.Range(bracePosition, bracePosition);
  editor.revealRange(range);
}

function Descend(
    editor: vscode.TextEditor, braces: BraceInfo[], cursorInfo: CursorInfo) {
  if (cursorInfo.nextBrace < braces.length &&
      braces[cursorInfo.nextBrace].depth > cursorInfo.depth) {
    SetCursorBrace(editor, braces[cursorInfo.nextBrace]);
    return;
  }
  for (let i = cursorInfo.nextBrace - 2; i >= 0; --i) {
    const brace = braces[i];
    if (brace.opening) {
      if (brace.depth == cursorInfo.depth) {
        return;
      }
      if (brace.depth == cursorInfo.depth + 1) {
        SetCursorBrace(editor, brace);
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
      SetCursorBrace(editor, brace);
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
      SetCursorBrace(editor, brace);
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
      SetCursorBrace(editor, brace);
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