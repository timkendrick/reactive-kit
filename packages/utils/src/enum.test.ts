import { describe, expect, test } from 'vitest';

import { Enum, VARIANT, type GenericEnum, type TypedEnum } from './enum';
import { unreachable } from './type';

describe('Enum', () => {
  type Color = Enum<{
    Rgb: {
      r: number;
      g: number;
      b: number;
    };
    Hsl: {
      h: number;
      s: number;
      l: number;
    };
    Cmyk: {
      c: number;
      m: number;
      y: number;
      k: number;
    };
    Transparent: void;
  }>;

  const Color = Enum.create<Color>({
    Rgb: true,
    Hsl: true,
    Cmyk: true,
    Transparent: true,
  });

  function eraseColorType(color: Color): Color {
    return color;
  }

  test('constructors', () => {
    {
      const color = Color.Rgb({ r: 0, g: 128, b: 255 });
      expect(Color.Rgb.is(color)).toBe(true);
      expect(Color.Hsl.is(color)).toBe(false);
      expect(Color.Cmyk.is(color)).toBe(false);
      expect(Color.Transparent.is(color)).toBe(false);
      expect(color.r).toBe(0);
      expect(color.g).toBe(128);
      expect(color.b).toBe(255);
    }
    {
      const color = Color.Hsl({ h: 180, s: 0.5, l: 1 });
      expect(Color.Rgb.is(color)).toBe(false);
      expect(Color.Hsl.is(color)).toBe(true);
      expect(Color.Cmyk.is(color)).toBe(false);
      expect(Color.Transparent.is(color)).toBe(false);
      expect(color.h).toBe(180);
      expect(color.s).toBe(0.5);
      expect(color.l).toBe(1);
    }
    {
      const color = Color.Cmyk({ c: 0, m: 1 / 3, y: 2 / 3, k: 1 });
      expect(Color.Rgb.is(color)).toBe(false);
      expect(Color.Hsl.is(color)).toBe(false);
      expect(Color.Cmyk.is(color)).toBe(true);
      expect(Color.Transparent.is(color)).toBe(false);
      expect(color.c).toBe(0);
      expect(color.m).toBe(1 / 3);
      expect(color.y).toBe(2 / 3);
      expect(color.k).toBe(1);
    }
    {
      const color = Color.Transparent();
      expect(Color.Rgb.is(color)).toBe(false);
      expect(Color.Hsl.is(color)).toBe(false);
      expect(Color.Cmyk.is(color)).toBe(false);
      expect(Color.Transparent.is(color)).toBe(true);
    }
  });

  test('discriminants', () => {
    expect(Color.Rgb.Type).toBe('Rgb');
    expect(Color.Hsl.Type).toBe('Hsl');
    expect(Color.Cmyk.Type).toBe('Cmyk');
    expect(Color.Transparent.Type).toBe('Transparent');

    const rgbColor = Color.Rgb({ r: 0, g: 128, b: 255 });
    expect(rgbColor[VARIANT]).toBe(Color.Rgb.Type);

    const hslColor = Color.Hsl({ h: 180, s: 0.5, l: 1 });
    expect(hslColor[VARIANT]).toBe(Color.Hsl.Type);
  });

  test('type guards', () => {
    const color = eraseColorType(Color.Rgb({ r: 0, g: 128, b: 255 }));
    const value = (() => {
      if (Color.Rgb.is(color)) {
        const { r, g, b } = color;
        return { r, g, b };
      } else if (Color.Hsl.is(color)) {
        const { h, s, l } = color;
        return { h, s, l };
      } else if (Color.Cmyk.is(color)) {
        const { c, m, y, k } = color;
        return { c, m, y, k };
      } else if (Color.Transparent.is(color)) {
        return null;
      } else {
        unreachable(color);
      }
    })();
    expect(value).toEqual({ r: 0, g: 128, b: 255 });
  });

  test('exhaustiveness checking', () => {
    const color = eraseColorType(Color.Rgb({ r: 0, g: 128, b: 255 }));
    const value = (() => {
      switch (color[VARIANT]) {
        case 'Rgb': {
          const { r, g, b } = color;
          return { r, g, b };
        }
        case 'Hsl': {
          const { h, s, l } = color;
          return { h, s, l };
        }
        case 'Cmyk': {
          const { c, m, y, k } = color;
          return { c, m, y, k };
        }
        case 'Transparent': {
          return null;
        }
        default: {
          unreachable(color);
        }
      }
    })();
    expect(value).toEqual({ r: 0, g: 128, b: 255 });
  });

  test('pattern matching', () => {
    const rgbColor = Color.Rgb({ r: 0, g: 128, b: 255 });
    const rgbResult = Enum.match(eraseColorType(rgbColor), {
      Rgb: ({ r, g, b }) => ({ r, g, b }),
      Hsl: ({ h, s, l }) => ({ h, s, l }),
      Cmyk: ({ c, m, y, k }) => ({ c, m, y, k }),
      Transparent: () => null,
    });
    expect(rgbResult).toEqual({ r: 0, g: 128, b: 255 });

    const hslColor: Color = Color.Hsl({ h: 180, s: 0.5, l: 1 });
    const hslResult = Enum.match(eraseColorType(hslColor), {
      Rgb: ({ r, g, b }) => ({ r, g, b }),
      Hsl: ({ h, s, l }) => ({ h, s, l }),
      Cmyk: ({ c, m, y, k }) => ({ c, m, y, k }),
      Transparent: () => null,
    });
    expect(hslResult).toEqual({ h: 180, s: 0.5, l: 1 });
  });

  describe('generics', () => {
    describe('single parameter', () => {
      type GenericColor<T> = Enum<{
        Rgb: {
          r: T;
          g: T;
          b: T;
        };
        Hsl: {
          h: T;
          s: T;
          l: T;
        };
        Cmyk: {
          c: T;
          m: T;
          y: T;
          k: T;
        };
        Transparent: void;
      }>;
      interface GenericColorType extends GenericEnum<1> {
        instance: GenericColor<this['T1']>;
      }

      test('generic usage', () => {
        const GenericColor = Enum.create<GenericColorType>({
          Rgb: true,
          Hsl: true,
          Cmyk: true,
          Transparent: true,
        });
        const numberColor = GenericColor.Rgb({ r: 0, g: 128, b: 255 });
        expect(GenericColor.Rgb.is(numberColor)).toBe(true);
        expect(GenericColor.Hsl.is(numberColor)).toBe(false);
        expect(numberColor.r).toBe(0);
        expect(numberColor.g).toBe(128);
        expect(numberColor.b).toBe(255);

        const stringColor = GenericColor.Hsl({ h: '180deg', s: '0%', l: '50%' });
        expect(GenericColor.Rgb.is(stringColor)).toBe(false);
        expect(GenericColor.Hsl.is(stringColor)).toBe(true);
        expect(stringColor.h).toBe('180deg');
        expect(stringColor.s).toBe('0%');
        expect(stringColor.l).toBe('50%');
      });

      test('static usage', () => {
        type TypedColor = TypedEnum<GenericColorType, number>;
        const TypedColor = Enum.create<TypedColor>({
          Rgb: true,
          Hsl: true,
          Cmyk: true,
          Transparent: true,
        });
        const color = TypedColor.Rgb({ r: 0, g: 128, b: 255 });
        expect(TypedColor.Rgb.is(color)).toBe(true);
        expect(TypedColor.Hsl.is(color)).toBe(false);
      });
    });

    describe('multiple parameters', () => {
      type GenericColor<TRgb, THsl, TCymk> = Enum<{
        Rgb: {
          r: TRgb;
          g: TRgb;
          b: TRgb;
        };
        Hsl: {
          h: THsl;
          s: THsl;
          l: THsl;
        };
        Cmyk: {
          c: TCymk;
          m: TCymk;
          y: TCymk;
          k: TCymk;
        };
        Transparent: void;
      }>;
      interface GenericColorType extends GenericEnum<3> {
        instance: GenericColor<this['T1'], this['T2'], this['T3']>;
      }

      test('generic usage', () => {
        const GenericColor = Enum.create<GenericColorType>({
          Rgb: true,
          Hsl: true,
          Cmyk: true,
          Transparent: true,
        });
        const numberColor = GenericColor.Rgb({ r: 0, g: 128, b: 255 });
        expect(GenericColor.Rgb.is(numberColor)).toBe(true);
        expect(GenericColor.Hsl.is(numberColor)).toBe(false);
        expect(numberColor.r).toBe(0);
        expect(numberColor.g).toBe(128);
        expect(numberColor.b).toBe(255);

        const stringColor = GenericColor.Hsl({ h: '180deg', s: '0%', l: '50%' });
        expect(GenericColor.Rgb.is(stringColor)).toBe(false);
        expect(GenericColor.Hsl.is(stringColor)).toBe(true);
        expect(stringColor.h).toBe('180deg');
        expect(stringColor.s).toBe('0%');
        expect(stringColor.l).toBe('50%');
      });

      test('static usage', () => {
        type TypedColor = TypedEnum<GenericColorType, number, string, number>;
        const TypedColor = Enum.create<TypedColor>({
          Rgb: true,
          Hsl: true,
          Cmyk: true,
          Transparent: true,
        });
        const numberColor = TypedColor.Rgb({ r: 0, g: 128, b: 255 });
        expect(TypedColor.Rgb.is(numberColor)).toBe(true);
        expect(TypedColor.Hsl.is(numberColor)).toBe(false);

        const stringColor = TypedColor.Hsl({ h: '180deg', s: '0%', l: '50%' });
        expect(TypedColor.Rgb.is(stringColor)).toBe(false);
        expect(TypedColor.Hsl.is(stringColor)).toBe(true);
        expect(stringColor.h).toBe('180deg');
        expect(stringColor.s).toBe('0%');
        expect(stringColor.l).toBe('50%');
      });
    });
  });
});
