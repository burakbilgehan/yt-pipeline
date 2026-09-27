/**
 * Picks the renderer from the project's render input: "catalog" (layout-2 videos
 * made from the scene catalog) or the legacy MainComposition.
 */
import React from "react";
import MainComposition from "./MainComposition";
import { CatalogVideo, type CatalogVideoProps } from "../catalog/CatalogVideo";

const VideoRouter: React.FC<any> = (props) =>
  props.renderer === "catalog" ? <CatalogVideo {...(props as CatalogVideoProps)} /> : <MainComposition {...props} />;

export default VideoRouter;
