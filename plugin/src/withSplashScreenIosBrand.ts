import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

import type { ConfigPlugin } from "@expo/config-plugins";

const appRequire = createRequire(path.join(process.cwd(), "package.json"));
const configPlugins = appRequire("@expo/config-plugins") as typeof import("@expo/config-plugins");
const pkg = require(path.join(__dirname, "../../package.json")) as { name: string; version: string };

const { IOSConfig, XML, createRunOncePlugin, withFinalizedMod, withPlugins } = configPlugins;

const BRAND_ICON_ID = "SplashScreenBrandIcon";
const BRAND_LABEL_ID = "SplashScreenBrandSlogan";
const BRAND_ICON_IMAGE_NAME = "SplashScreenBrandIcon";
const BRAND_ICON_IMAGESET_NAME = `${BRAND_ICON_IMAGE_NAME}.imageset`;

export interface SplashScreenBrandPluginOptions {
  icon: string;
  slogan: string;
  iconWidth?: number;
  iconHeight?: number;
  sloganFontSize?: number;
  sloganColor?: string;
  spacing?: number;
  horizontalPadding?: number;
}

interface NormalizedBrandOptions {
  icon: string;
  slogan: string;
  iconWidth: number;
  iconHeight: number;
  sloganFontSize: number;
  sloganColor: string;
  spacing: number;
  horizontalPadding: number;
}

function normalizeOptions(options: SplashScreenBrandPluginOptions): NormalizedBrandOptions {
  if (!options?.icon) {
    throw new Error(`${pkg.name}: "icon" is required.`);
  }

  if (!options?.slogan) {
    throw new Error(`${pkg.name}: "slogan" is required.`);
  }

  return {
    icon: options.icon,
    slogan: options.slogan,
    iconWidth: options.iconWidth ?? 40,
    iconHeight: options.iconHeight ?? options.iconWidth ?? 40,
    sloganFontSize: options.sloganFontSize ?? 14,
    sloganColor: options.sloganColor ?? "#b8b8b8",
    spacing: options.spacing ?? 12,
    horizontalPadding: options.horizontalPadding ?? 32,
  };
}

function toStoryboardNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ensureFirstObjectNode<T extends Record<string, any>>(
  parent: Record<string, any>,
  key: string,
  createValue: () => T
): T {
  const currentValue = parent[key];

  if (!Array.isArray(currentValue)) {
    const nextValue = createValue();
    parent[key] = [nextValue];
    return nextValue;
  }

  const firstValue = currentValue[0];
  if (!firstValue || typeof firstValue !== "object" || Array.isArray(firstValue)) {
    const nextValue = createValue();
    currentValue[0] = nextValue;
    return nextValue;
  }

  return firstValue as T;
}

function hexToSrgbComponents(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`${pkg.name}: sloganColor must be a 6-digit hex color.`);
  }

  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  return {
    red: red.toFixed(6),
    green: green.toFixed(6),
    blue: blue.toFixed(6),
  };
}

function getBrandIconNode(options: NormalizedBrandOptions) {
  return {
    $: {
      id: BRAND_ICON_ID,
      userLabel: BRAND_ICON_ID,
      image: BRAND_ICON_IMAGE_NAME,
      contentMode: "scaleAspectFit",
      clipsSubviews: "true",
      userInteractionEnabled: "false",
      translatesAutoresizingMaskIntoConstraints: "false",
    },
    rect: [
      {
        $: {
          key: "frame",
          x: "176.5",
          y: "734",
          width: toStoryboardNumber(options.iconWidth),
          height: toStoryboardNumber(options.iconHeight),
        },
      },
    ],
  };
}

function getBrandLabelNode(options: NormalizedBrandOptions) {
  const color = hexToSrgbComponents(options.sloganColor);

  return {
    $: {
      id: BRAND_LABEL_ID,
      userLabel: BRAND_LABEL_ID,
      opaque: "NO",
      clipsSubviews: "YES",
      userInteractionEnabled: "NO",
      contentMode: "left",
      horizontalHuggingPriority: "251",
      verticalHuggingPriority: "251",
      text: options.slogan,
      textAlignment: "center",
      lineBreakMode: "tailTruncation",
      baselineAdjustment: "alignBaselines",
      minimumFontSize: "9",
      adjustsFontSizeToFit: "NO",
      translatesAutoresizingMaskIntoConstraints: "false",
    },
    rect: [
      {
        $: {
          key: "frame",
          x: "96.5",
          y: "786",
          width: "200",
          height: "17",
        },
      },
    ],
    fontDescription: [
      {
        $: {
          key: "fontDescription",
          type: "system",
          pointSize: toStoryboardNumber(options.sloganFontSize),
        },
      },
    ],
    color: [
      {
        $: {
          key: "textColor",
          red: color.red,
          green: color.green,
          blue: color.blue,
          alpha: "1",
          colorSpace: "custom",
          customColorSpace: "sRGB",
        },
      },
    ],
    nil: [
      {
        $: {
          key: "highlightedColor",
        },
      },
    ],
  };
}

function getBrandConstraints(viewId: string, safeAreaId: string, options: NormalizedBrandOptions) {
  return [
    {
      $: {
        firstItem: BRAND_ICON_ID,
        firstAttribute: "centerX",
        secondItem: viewId,
        secondAttribute: "centerX",
        id: "SplashScreenBrandIconCenterX",
      },
    },
    {
      $: {
        firstItem: BRAND_ICON_ID,
        firstAttribute: "width",
        constant: toStoryboardNumber(options.iconWidth),
        id: "SplashScreenBrandIconWidth",
      },
    },
    {
      $: {
        firstItem: BRAND_ICON_ID,
        firstAttribute: "height",
        constant: toStoryboardNumber(options.iconHeight),
        id: "SplashScreenBrandIconHeight",
      },
    },
    {
      $: {
        firstItem: BRAND_LABEL_ID,
        firstAttribute: "top",
        secondItem: BRAND_ICON_ID,
        secondAttribute: "bottom",
        constant: toStoryboardNumber(options.spacing),
        id: "SplashScreenBrandLabelTop",
      },
    },
    {
      $: {
        firstItem: BRAND_LABEL_ID,
        firstAttribute: "leading",
        secondItem: safeAreaId,
        secondAttribute: "leading",
        constant: toStoryboardNumber(options.horizontalPadding),
        id: "SplashScreenBrandLabelLeading",
      },
    },
    {
      $: {
        firstItem: safeAreaId,
        firstAttribute: "trailing",
        secondItem: BRAND_LABEL_ID,
        secondAttribute: "trailing",
        constant: toStoryboardNumber(options.horizontalPadding),
        id: "SplashScreenBrandLabelTrailing",
      },
    },
    {
      $: {
        firstItem: safeAreaId,
        firstAttribute: "bottom",
        secondItem: BRAND_LABEL_ID,
        secondAttribute: "bottom",
        id: "SplashScreenBrandLabelBottom",
      },
    },
  ];
}

async function ensureBrandImagesetAsync(projectRoot: string, options: NormalizedBrandOptions) {
  const sourceRoot = IOSConfig.Paths.getSourceRoot(projectRoot);
  const imagesetPath = path.join(sourceRoot, "Images.xcassets", BRAND_ICON_IMAGESET_NAME);
  const sourceImagePath = path.resolve(projectRoot, options.icon);
  const extension = path.extname(sourceImagePath) || ".png";

  await fs.access(sourceImagePath);
  await fs.mkdir(imagesetPath, { recursive: true });

  const files = await fs.readdir(imagesetPath);
  await Promise.all(
    files
      .filter((file) => file !== "Contents.json")
      .map((file) => fs.rm(path.join(imagesetPath, file), { force: true }))
  );

  const imageFiles = ["image", "image@2x", "image@3x"].map((name) => `${name}${extension}`);

  await Promise.all(
    imageFiles.map((fileName) => fs.copyFile(sourceImagePath, path.join(imagesetPath, fileName)))
  );

  await fs.writeFile(
    path.join(imagesetPath, "Contents.json"),
    `${JSON.stringify(
      {
        images: [
          { idiom: "universal", filename: imageFiles[0], scale: "1x" },
          { idiom: "universal", filename: imageFiles[1], scale: "2x" },
          { idiom: "universal", filename: imageFiles[2], scale: "3x" },
        ],
        info: {
          version: 1,
          author: "expo",
        },
      },
      null,
      2
    )}\n`
  );
}

export async function applyBrandingToSplashScreenStoryboard(
  contents: string,
  rawOptions: SplashScreenBrandPluginOptions
) {
  const options = normalizeOptions(rawOptions);
  const storyboard = await XML.parseXMLAsync(contents);
  const brandedStoryboard = applyBrandingToStoryboardObject(storyboard, options);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${XML.format(brandedStoryboard)}\n`;
}

function applyBrandingToStoryboardObject(storyboard: any, options: NormalizedBrandOptions) {
  const document = storyboard.document;
  const view = document.scenes[0].scene[0].objects[0].viewController[0].view[0];
  const viewId = view.$.id;
  const safeAreaId = view.viewLayoutGuide?.[0]?.$.id ?? viewId;
  const subviews = ensureFirstObjectNode(view, "subviews", () => ({} as any)) as any;
  const constraintsContainer = ensureFirstObjectNode(view, "constraints", () => ({ constraint: [] as any[] })) as any;
  const resources = ensureFirstObjectNode(document, "resources", () => ({} as any)) as any;
  const existingImageViews = Array.isArray(subviews.imageView) ? subviews.imageView : [];
  const hasExpoSplashLogo = existingImageViews.some((item: any) => item?.$?.id === "EXPO-SplashScreen");

  subviews.imageView = existingImageViews.filter((item: any) => item.$?.id !== BRAND_ICON_ID);
  subviews.imageView.push(getBrandIconNode(options));

  subviews.label = (subviews.label ?? []).filter((item: any) => item.$?.id !== BRAND_LABEL_ID);
  subviews.label.push(getBrandLabelNode(options));

  const brandConstraints = getBrandConstraints(viewId, safeAreaId, options) as any[];
  const brandConstraintIds = new Set(brandConstraints.map((item) => item.$.id));
  constraintsContainer.constraint = (constraintsContainer.constraint ?? []).filter((item: any) => {
    if (brandConstraintIds.has(item.$?.id)) {
      return false;
    }

    if (!hasExpoSplashLogo && (item.$?.firstItem === "EXPO-SplashScreen" || item.$?.secondItem === "EXPO-SplashScreen")) {
      return false;
    }

    return true;
  });
  constraintsContainer.constraint.push(...brandConstraints);

  resources.image = (resources.image ?? []).filter((item: any) => item.$?.name !== BRAND_ICON_IMAGE_NAME);
  resources.image.push({
    $: {
      name: BRAND_ICON_IMAGE_NAME,
      width: toStoryboardNumber(options.iconWidth),
      height: toStoryboardNumber(options.iconHeight),
    },
  });

  return storyboard;
}

export const withIosSplashBrand: ConfigPlugin<SplashScreenBrandPluginOptions> = (config, rawOptions) => {
  const options = normalizeOptions(rawOptions);

  return withFinalizedMod(config, [
    "ios",
    async (nextConfig) => {
      const sourceRoot = IOSConfig.Paths.getSourceRoot(nextConfig.modRequest.projectRoot);
      const storyboardPath = path.join(sourceRoot, "SplashScreen.storyboard");
      const storyboard = await fs.readFile(storyboardPath, "utf8");
      const brandedStoryboard = await applyBrandingToSplashScreenStoryboard(storyboard, options);

      await fs.writeFile(storyboardPath, brandedStoryboard);
      await ensureBrandImagesetAsync(nextConfig.modRequest.projectRoot, options);

      return nextConfig;
    },
  ]);
};

const withIosSplashBrandRunOnce = createRunOncePlugin(withIosSplashBrand, pkg.name, pkg.version);

const withSplashScreenIosBrand: ConfigPlugin<SplashScreenBrandPluginOptions> = (config, options) => {
  return withPlugins(config, [[withIosSplashBrandRunOnce, options]]);
};

export default withSplashScreenIosBrand;
