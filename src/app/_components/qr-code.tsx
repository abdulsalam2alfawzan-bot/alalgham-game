"use client";

import { useMemo } from "react";

const version = 4;
const size = 21 + (version - 1) * 4;
const dataCodewords = 80;
const errorCorrectionCodewords = 20;
const maskPattern = 0;
const lowErrorCorrectionFormat = 1;

const gfExp = Array<number>(512);
const gfLog = Array<number>(256);

let gfValue = 1;
for (let index = 0; index < 255; index++) {
  gfExp[index] = gfValue;
  gfLog[gfValue] = index;
  gfValue <<= 1;
  if (gfValue & 0x100) {
    gfValue ^= 0x11d;
  }
}

for (let index = 255; index < gfExp.length; index++) {
  gfExp[index] = gfExp[index - 255];
}

function gfMultiply(left: number, right: number) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return gfExp[gfLog[left] + gfLog[right]];
}

function reedSolomonDivisor(degree: number) {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;

  let root = 1;
  for (let index = 0; index < degree; index++) {
    for (let coefficient = 0; coefficient < result.length; coefficient++) {
      result[coefficient] = gfMultiply(result[coefficient], root);
      if (coefficient + 1 < result.length) {
        result[coefficient] ^= result[coefficient + 1];
      }
    }

    root = gfMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = Array<number>(divisor.length).fill(0);

  for (const codeword of data) {
    const factor = codeword ^ result.shift()!;
    result.push(0);

    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }

  return result;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index--) {
    bits.push((value >>> index) & 1);
  }
}

function makeDataCodewords(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));
  const maxBytes = dataCodewords - 2;
  const safeBytes = bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;
  const bits: number[] = [];

  appendBits(bits, 0x4, 4);
  appendBits(bits, safeBytes.length, 8);
  safeBytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacity = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = Array.from({ length: bits.length / 8 }, (_, index) =>
    bits
      .slice(index * 8, index * 8 + 8)
      .reduce((codeword, bit) => (codeword << 1) | bit, 0),
  );

  for (let pad = 0xec; codewords.length < dataCodewords; pad ^= 0xfd) {
    codewords.push(pad);
  }

  return codewords;
}

function makeCodewords(value: string) {
  const data = makeDataCodewords(value);
  const divisor = reedSolomonDivisor(errorCorrectionCodewords);
  const errorCorrection = reedSolomonRemainder(data, divisor);
  return [...data, ...errorCorrection];
}

function makeMatrix() {
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  function setFunctionModule(x: number, y: number, isDark: boolean) {
    modules[y][x] = isDark;
    reserved[y][x] = true;
  }

  function drawFinderPattern(originX: number, originY: number) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const moduleX = originX + x;
        const moduleY = originY + y;
        if (moduleX < 0 || moduleY < 0 || moduleX >= size || moduleY >= size) {
          continue;
        }

        const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        setFunctionModule(moduleX, moduleY, isBorder || isCenter);
      }
    }
  }

  function drawAlignmentPattern(centerX: number, centerY: number) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        const distance = Math.max(Math.abs(x), Math.abs(y));
        setFunctionModule(centerX + x, centerY + y, distance === 2 || distance === 0);
      }
    }
  }

  function drawTimingPatterns() {
    for (let index = 8; index < size - 8; index++) {
      const isDark = index % 2 === 0;
      setFunctionModule(6, index, isDark);
      setFunctionModule(index, 6, isDark);
    }
  }

  function formatBits() {
    const data = (lowErrorCorrectionFormat << 3) | maskPattern;
    let remainder = data << 10;

    for (let index = 14; index >= 10; index--) {
      if (((remainder >>> index) & 1) !== 0) {
        remainder ^= 0x537 << (index - 10);
      }
    }

    return ((data << 10) | remainder) ^ 0x5412;
  }

  function formatBit(bits: number, index: number) {
    return ((bits >>> index) & 1) !== 0;
  }

  function drawFormatBits() {
    const bits = formatBits();

    for (let index = 0; index <= 5; index++) {
      setFunctionModule(8, index, formatBit(bits, index));
    }
    setFunctionModule(8, 7, formatBit(bits, 6));
    setFunctionModule(8, 8, formatBit(bits, 7));
    setFunctionModule(7, 8, formatBit(bits, 8));
    for (let index = 9; index < 15; index++) {
      setFunctionModule(14 - index, 8, formatBit(bits, index));
    }

    for (let index = 0; index < 8; index++) {
      setFunctionModule(size - 1 - index, 8, formatBit(bits, index));
    }
    for (let index = 8; index < 15; index++) {
      setFunctionModule(8, size - 15 + index, formatBit(bits, index));
    }

    setFunctionModule(8, size - 8, true);
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(size - 7, 0);
  drawFinderPattern(0, size - 7);
  drawAlignmentPattern(size - 7, size - 7);
  drawTimingPatterns();
  drawFormatBits();

  return { modules, reserved, setFunctionModule, drawFormatBits };
}

function moduleBit(codewords: number[], index: number) {
  return ((codewords[Math.floor(index / 8)] >>> (7 - (index % 8))) & 1) !== 0;
}

function makeQrModules(value: string) {
  const codewords = makeCodewords(value);
  const { modules, reserved, drawFormatBits } = makeMatrix();
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }

    for (let vertical = 0; vertical < size; vertical++) {
      const y = upward ? size - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        if (reserved[y][x]) {
          continue;
        }

        const isDark = bitIndex < codewords.length * 8 ? moduleBit(codewords, bitIndex) : false;
        const isMasked = (x + y) % 2 === 0;
        modules[y][x] = isDark !== isMasked;
        bitIndex++;
      }
    }

    upward = !upward;
  }

  drawFormatBits();
  return modules;
}

export function QrCode({ label, value }: { label: string; value: string }) {
  const modules = useMemo(() => makeQrModules(value), [value]);
  const quietZone = 4;
  const viewSize = modules.length + quietZone * 2;

  return (
    <div className="grid justify-items-center gap-2">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="aspect-square w-44 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
        shapeRendering="crispEdges"
      >
        <rect width={viewSize} height={viewSize} fill="white" />
        {modules.flatMap((row, y) =>
          row.map((isDark, x) =>
            isDark ? (
              <rect
                key={`${x}-${y}`}
                x={x + quietZone}
                y={y + quietZone}
                width="1"
                height="1"
                fill="#020617"
              />
            ) : null,
          ),
        )}
      </svg>
      <p className="text-center text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
