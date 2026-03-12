import type { ConfigPlugin } from "@expo/config-plugins";
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
export declare function applyBrandingToSplashScreenStoryboard(contents: string, rawOptions: SplashScreenBrandPluginOptions): Promise<string>;
export declare const withIosSplashBrand: ConfigPlugin<SplashScreenBrandPluginOptions>;
declare const withSplashScreenIosBrand: ConfigPlugin<SplashScreenBrandPluginOptions>;
export default withSplashScreenIosBrand;
