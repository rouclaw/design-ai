export type ValidationError = { path: string; message: string };

export type ValidationContext = { errors: ValidationError[]; partial: boolean; transform?: (tag: string, value: unknown) => unknown };

export function validate_variable(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "string") {
    ctx.errors.push({ path: path, message: "expected \"$variable\"" + ", got " + JSON.stringify(v) });
  } else if (!_re0.test(v)) {
    ctx.errors.push({ path: path, message: "expected \"$variable\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_booleanOrVariable(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v === "string") {
    const _v0: ValidationContext = { errors: [], partial: ctx.partial };
    let _v1 = false;
    if (!_v1) {
      const _v2: ValidationContext = { errors: [], partial: _v0.partial };
      validate_variable(v, _v2, path);
      if (_v2.errors.length === 0) _v1 = true;
    }
    if (!_v1) {
      _v0.errors.push({ path: path, message: "expected one of: \"$variable\"" + ", got " + JSON.stringify(v) });
    }
    if (_v0.errors.length > 0) {
      ctx.errors.push({ path: path, message: "expected either boolean or \"$variable\"" + ", got " + JSON.stringify(v) });
    }
  } else if (!(typeof v === "boolean")) {
    ctx.errors.push({ path: path, message: "expected either boolean or \"$variable\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_theme(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v3 = v as Record<string, unknown>;
    for (const _v4 of Object.keys(_v3)) {
      if (typeof _v3[_v4] !== "string") {
        ctx.errors.push({ path: path + "/" + _v4, message: "expected string" + ", got " + JSON.stringify(_v3[_v4]) });
      }
    }
  }
}

export function validate_color(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "string") {
    ctx.errors.push({ path: path, message: "expected color hex string (#RRGGBBAA, #RRGGBB or #RGB)" + ", got " + JSON.stringify(v) });
  } else if (!_re1.test(v)) {
    ctx.errors.push({ path: path, message: "expected color hex string (#RRGGBBAA, #RRGGBB or #RGB)" + ", got " + JSON.stringify(v) });
  }
}

export function validate_colorOrVariable(v: unknown, ctx: ValidationContext, path: string): void {
  let _v5 = false;
  if (!_v5) {
    const _v6: ValidationContext = { errors: [], partial: ctx.partial };
    validate_color(v, _v6, path);
    if (_v6.errors.length === 0) _v5 = true;
  }
  if (!_v5) {
    const _v7: ValidationContext = { errors: [], partial: ctx.partial };
    validate_variable(v, _v7, path);
    if (_v7.errors.length === 0) _v5 = true;
  }
  if (!_v5) {
    ctx.errors.push({ path: path, message: "expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or \"$variable\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_numberOrVariable(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v === "string") {
    const _v8: ValidationContext = { errors: [], partial: ctx.partial };
    let _v9 = false;
    if (!_v9) {
      const _v10: ValidationContext = { errors: [], partial: _v8.partial };
      validate_variable(v, _v10, path);
      if (_v10.errors.length === 0) _v9 = true;
    }
    if (!_v9) {
      _v8.errors.push({ path: path, message: "expected one of: \"$variable\"" + ", got " + JSON.stringify(v) });
    }
    if (_v8.errors.length > 0) {
      ctx.errors.push({ path: path, message: "expected either number or \"$variable\"" + ", got " + JSON.stringify(v) });
    }
  } else if (!(typeof v === "number")) {
    ctx.errors.push({ path: path, message: "expected either number or \"$variable\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_stringOrVariable(v: unknown, ctx: ValidationContext, path: string): void {
  let _v11 = false;
  if (!_v11) {
    const _v12: ValidationContext = { errors: [], partial: ctx.partial };
    if (typeof v !== "string") {
      _v12.errors.push({ path: path, message: "expected string" + ", got " + JSON.stringify(v) });
    }
    if (_v12.errors.length === 0) _v11 = true;
  }
  if (!_v11) {
    const _v13: ValidationContext = { errors: [], partial: ctx.partial };
    validate_variable(v, _v13, path);
    if (_v13.errors.length === 0) _v11 = true;
  }
  if (!_v11) {
    ctx.errors.push({ path: path, message: "expected either string or \"$variable\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_position(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v14 = v as Record<string, unknown>;
    if (_v14["x"] !== undefined) {
      if (typeof _v14["x"] !== "number") {
        ctx.errors.push({ path: path + "/x", message: "expected number" + ", got " + JSON.stringify(_v14["x"]) });
      }
    }
    if (_v14["y"] !== undefined) {
      if (typeof _v14["y"] !== "number") {
        ctx.errors.push({ path: path + "/y", message: "expected number" + ", got " + JSON.stringify(_v14["y"]) });
      }
    }
  }
}

export function validate_entity(v: unknown, ctx: ValidationContext, path: string): void {
  validate_position(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v15 = v as Record<string, unknown>;
    if (!ctx.partial && !("id" in _v15)) {
      ctx.errors.push({ path: path + "/id", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v15["id"] !== undefined) {
      if (typeof _v15["id"] !== "string") {
        ctx.errors.push({ path: path + "/id", message: "expected string without slashes" + ", got " + JSON.stringify(_v15["id"]) });
      } else if (!_re2.test(_v15["id"])) {
        ctx.errors.push({ path: path + "/id", message: "expected string without slashes" + ", got " + JSON.stringify(_v15["id"]) });
      }
    }
    if (_v15["name"] !== undefined) {
      if (typeof _v15["name"] !== "string") {
        ctx.errors.push({ path: path + "/name", message: "expected string" + ", got " + JSON.stringify(_v15["name"]) });
      }
    }
    if (_v15["context"] !== undefined) {
      if (typeof _v15["context"] !== "string") {
        ctx.errors.push({ path: path + "/context", message: "expected string" + ", got " + JSON.stringify(_v15["context"]) });
      }
    }
    if (_v15["reusable"] !== undefined) {
      if (typeof _v15["reusable"] !== "boolean") {
        ctx.errors.push({ path: path + "/reusable", message: "expected boolean" + ", got " + JSON.stringify(_v15["reusable"]) });
      }
    }
    if (_v15["theme"] !== undefined) {
      validate_theme(_v15["theme"], ctx, path + "/theme");
    }
    if (_v15["enabled"] !== undefined) {
      validate_booleanOrVariable(_v15["enabled"], ctx, path + "/enabled");
    }
    if (_v15["opacity"] !== undefined) {
      validate_numberOrVariable(_v15["opacity"], ctx, path + "/opacity");
    }
    if (_v15["flipX"] !== undefined) {
      validate_booleanOrVariable(_v15["flipX"], ctx, path + "/flipX");
    }
    if (_v15["flipY"] !== undefined) {
      validate_booleanOrVariable(_v15["flipY"], ctx, path + "/flipY");
    }
    if (_v15["layoutPosition"] !== undefined) {
      if (_v15["layoutPosition"] !== "auto" && _v15["layoutPosition"] !== "absolute") {
        ctx.errors.push({ path: path + "/layoutPosition", message: "expected one of: \"auto\", \"absolute\"" + ", got " + JSON.stringify(_v15["layoutPosition"]) });
      }
    }
    if (_v15["metadata"] !== undefined) {
      if (typeof _v15["metadata"] !== "object" || _v15["metadata"] === null) {
        ctx.errors.push({ path: path + "/metadata", message: "expected object" + ", got " + JSON.stringify(_v15["metadata"]) });
      } else {
        const _v16 = _v15["metadata"] as Record<string, unknown>;
        if (!ctx.partial && !("type" in _v16)) {
          ctx.errors.push({ path: path + "/metadata" + "/type", message: "missing required property" + ", got " + JSON.stringify(_v15["metadata"]) });
        } else if (_v16["type"] !== undefined) {
          if (typeof _v16["type"] !== "string") {
            ctx.errors.push({ path: path + "/metadata" + "/type", message: "expected string" + ", got " + JSON.stringify(_v16["type"]) });
          }
        }
      }
    }
    if (_v15["rotation"] !== undefined) {
      validate_numberOrVariable(_v15["rotation"], ctx, path + "/rotation");
    }
  }
}

export function validate_sizingBehavior(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "string") {
    ctx.errors.push({ path: path, message: "expected sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(v) });
  } else if (!_re3.test(v)) {
    ctx.errors.push({ path: path, message: "expected sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(v) });
  }
}

export function validate_size(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v17 = v as Record<string, unknown>;
    if (_v17["width"] !== undefined) {
      const _v18: ValidationContext = { errors: [], partial: ctx.partial };
      let _v19 = false;
      if (!_v19) {
        const _v20: ValidationContext = { errors: [], partial: _v18.partial };
        validate_numberOrVariable(_v17["width"], _v20, path + "/width");
        if (_v20.errors.length === 0) _v19 = true;
      }
      if (!_v19) {
        const _v21: ValidationContext = { errors: [], partial: _v18.partial };
        validate_sizingBehavior(_v17["width"], _v21, path + "/width");
        if (_v21.errors.length === 0) _v19 = true;
      }
      if (!_v19) {
        _v18.errors.push({ path: path + "/width", message: "expected one of: number, \"$variable\", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(_v17["width"]) });
      }
      if (_v18.errors.length > 0 && ctx.transform) {
        const _v22 = ctx.transform("sizingBehavior", _v17["width"]);
        if (_v22 !== undefined) _v17["width"] = _v22;
        let _v23 = false;
        if (!_v23) {
          const _v24: ValidationContext = { errors: [], partial: ctx.partial };
          validate_numberOrVariable(_v17["width"], _v24, path + "/width");
          if (_v24.errors.length === 0) _v23 = true;
        }
        if (!_v23) {
          const _v25: ValidationContext = { errors: [], partial: ctx.partial };
          validate_sizingBehavior(_v17["width"], _v25, path + "/width");
          if (_v25.errors.length === 0) _v23 = true;
        }
        if (!_v23) {
          ctx.errors.push({ path: path + "/width", message: "expected one of: number, \"$variable\", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(_v17["width"]) });
        }
      } else {
        for (const _e of _v18.errors) ctx.errors.push(_e);
      }
    }
    if (_v17["height"] !== undefined) {
      const _v26: ValidationContext = { errors: [], partial: ctx.partial };
      let _v27 = false;
      if (!_v27) {
        const _v28: ValidationContext = { errors: [], partial: _v26.partial };
        validate_numberOrVariable(_v17["height"], _v28, path + "/height");
        if (_v28.errors.length === 0) _v27 = true;
      }
      if (!_v27) {
        const _v29: ValidationContext = { errors: [], partial: _v26.partial };
        validate_sizingBehavior(_v17["height"], _v29, path + "/height");
        if (_v29.errors.length === 0) _v27 = true;
      }
      if (!_v27) {
        _v26.errors.push({ path: path + "/height", message: "expected one of: number, \"$variable\", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(_v17["height"]) });
      }
      if (_v26.errors.length > 0 && ctx.transform) {
        const _v30 = ctx.transform("sizingBehavior", _v17["height"]);
        if (_v30 !== undefined) _v17["height"] = _v30;
        let _v31 = false;
        if (!_v31) {
          const _v32: ValidationContext = { errors: [], partial: ctx.partial };
          validate_numberOrVariable(_v17["height"], _v32, path + "/height");
          if (_v32.errors.length === 0) _v31 = true;
        }
        if (!_v31) {
          const _v33: ValidationContext = { errors: [], partial: ctx.partial };
          validate_sizingBehavior(_v17["height"], _v33, path + "/height");
          if (_v33.errors.length === 0) _v31 = true;
        }
        if (!_v31) {
          ctx.errors.push({ path: path + "/height", message: "expected one of: number, \"$variable\", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100))" + ", got " + JSON.stringify(_v17["height"]) });
        }
      } else {
        for (const _e of _v26.errors) ctx.errors.push(_e);
      }
    }
  }
}

export function validate_blendMode(v: unknown, ctx: ValidationContext, path: string): void {
  if (v !== "normal" && v !== "darken" && v !== "multiply" && v !== "linearBurn" && v !== "colorBurn" && v !== "light" && v !== "screen" && v !== "linearDodge" && v !== "colorDodge" && v !== "overlay" && v !== "softLight" && v !== "hardLight" && v !== "difference" && v !== "exclusion" && v !== "hue" && v !== "saturation" && v !== "color" && v !== "luminosity") {
    ctx.errors.push({ path: path, message: "expected one of: \"normal\", \"darken\", \"multiply\", \"linearBurn\", \"colorBurn\", \"light\", \"screen\", \"linearDodge\", \"colorDodge\", \"overlay\", \"softLight\", \"hardLight\", \"difference\", \"exclusion\", \"hue\", \"saturation\", \"color\", \"luminosity\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_effect(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected one of: \"blur\", \"background_blur\", \"shadow\"" + ", got " + JSON.stringify(v) });
  } else {
    const _v34 = v as Record<string, unknown>;
    switch (_v34["type"]) {
      case "blur":
        if (typeof v !== "object" || v === null) {
          ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
        } else {
          const _v35 = v as Record<string, unknown>;
          if (_v35["enabled"] !== undefined) {
            validate_booleanOrVariable(_v35["enabled"], ctx, path + "/enabled");
          }
          if (!ctx.partial && !("type" in _v35)) {
            ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
          } else if (_v35["type"] !== undefined) {
            if (_v35["type"] !== "blur") {
              ctx.errors.push({ path: path + "/type", message: "expected " + "\"blur\"" + ", got " + JSON.stringify(_v35["type"]) });
            }
          }
          if (_v35["radius"] !== undefined) {
            validate_numberOrVariable(_v35["radius"], ctx, path + "/radius");
          }
          for (const _v36 of Object.keys(_v35)) {
            if (_v36 !== "enabled" && _v36 !== "type" && _v36 !== "radius") {
              ctx.errors.push({ path: path + "/" + _v36, message: "unexpected property" + ", got " + JSON.stringify(_v36) });
            }
          }
        }
        break;
      case "background_blur":
        if (typeof v !== "object" || v === null) {
          ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
        } else {
          const _v37 = v as Record<string, unknown>;
          if (_v37["enabled"] !== undefined) {
            validate_booleanOrVariable(_v37["enabled"], ctx, path + "/enabled");
          }
          if (!ctx.partial && !("type" in _v37)) {
            ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
          } else if (_v37["type"] !== undefined) {
            if (_v37["type"] !== "background_blur") {
              ctx.errors.push({ path: path + "/type", message: "expected " + "\"background_blur\"" + ", got " + JSON.stringify(_v37["type"]) });
            }
          }
          if (_v37["radius"] !== undefined) {
            validate_numberOrVariable(_v37["radius"], ctx, path + "/radius");
          }
          for (const _v38 of Object.keys(_v37)) {
            if (_v38 !== "enabled" && _v38 !== "type" && _v38 !== "radius") {
              ctx.errors.push({ path: path + "/" + _v38, message: "unexpected property" + ", got " + JSON.stringify(_v38) });
            }
          }
        }
        break;
      case "shadow":
        if (typeof v !== "object" || v === null) {
          ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
        } else {
          const _v39 = v as Record<string, unknown>;
          if (!ctx.partial && !("type" in _v39)) {
            ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
          } else if (_v39["type"] !== undefined) {
            if (_v39["type"] !== "shadow") {
              ctx.errors.push({ path: path + "/type", message: "expected " + "\"shadow\"" + ", got " + JSON.stringify(_v39["type"]) });
            }
          }
          if (_v39["enabled"] !== undefined) {
            validate_booleanOrVariable(_v39["enabled"], ctx, path + "/enabled");
          }
          if (_v39["shadowType"] !== undefined) {
            if (_v39["shadowType"] !== "inner" && _v39["shadowType"] !== "outer") {
              ctx.errors.push({ path: path + "/shadowType", message: "expected one of: \"inner\", \"outer\"" + ", got " + JSON.stringify(_v39["shadowType"]) });
            }
          }
          if (_v39["offset"] !== undefined) {
            if (typeof _v39["offset"] !== "object" || _v39["offset"] === null) {
              ctx.errors.push({ path: path + "/offset", message: "expected object" + ", got " + JSON.stringify(_v39["offset"]) });
            } else {
              const _v40 = _v39["offset"] as Record<string, unknown>;
              if (!ctx.partial && !("x" in _v40)) {
                ctx.errors.push({ path: path + "/offset" + "/x", message: "missing required property" + ", got " + JSON.stringify(_v39["offset"]) });
              } else if (_v40["x"] !== undefined) {
                validate_numberOrVariable(_v40["x"], ctx, path + "/offset" + "/x");
              }
              if (!ctx.partial && !("y" in _v40)) {
                ctx.errors.push({ path: path + "/offset" + "/y", message: "missing required property" + ", got " + JSON.stringify(_v39["offset"]) });
              } else if (_v40["y"] !== undefined) {
                validate_numberOrVariable(_v40["y"], ctx, path + "/offset" + "/y");
              }
              for (const _v41 of Object.keys(_v40)) {
                if (_v41 !== "x" && _v41 !== "y") {
                  ctx.errors.push({ path: path + "/offset" + "/" + _v41, message: "unexpected property" + ", got " + JSON.stringify(_v41) });
                }
              }
            }
          }
          if (_v39["spread"] !== undefined) {
            validate_numberOrVariable(_v39["spread"], ctx, path + "/spread");
          }
          if (_v39["blur"] !== undefined) {
            validate_numberOrVariable(_v39["blur"], ctx, path + "/blur");
          }
          if (_v39["color"] !== undefined) {
            const _v42: ValidationContext = { errors: [], partial: ctx.partial };
            validate_colorOrVariable(_v39["color"], _v42, path + "/color");
            if (_v42.errors.length > 0 && ctx.transform) {
              const _v43 = ctx.transform("color", _v39["color"]);
              if (_v43 !== undefined) _v39["color"] = _v43;
              validate_colorOrVariable(_v39["color"], ctx, path + "/color");
            } else {
              for (const _e of _v42.errors) ctx.errors.push(_e);
            }
          }
          if (_v39["blendMode"] !== undefined) {
            validate_blendMode(_v39["blendMode"], ctx, path + "/blendMode");
          }
          for (const _v44 of Object.keys(_v39)) {
            if (_v44 !== "type" && _v44 !== "enabled" && _v44 !== "shadowType" && _v44 !== "offset" && _v44 !== "spread" && _v44 !== "blur" && _v44 !== "color" && _v44 !== "blendMode") {
              ctx.errors.push({ path: path + "/" + _v44, message: "unexpected property" + ", got " + JSON.stringify(_v44) });
            }
          }
        }
        break;
      default:
        ctx.errors.push({ path: path + "/type", message: "expected one of: \"blur\", \"background_blur\", \"shadow\"" + ", got " + JSON.stringify(_v34["type"]) });
    }
  }
}

export function validate_effects(v: unknown, ctx: ValidationContext, path: string): void {
  if (Array.isArray(v)) {
    for (let _v45 = 0; _v45 < v.length; _v45++) {
      validate_effect(v[_v45], ctx, path + "/" + _v45);
    }
  } else {
    validate_effect(v, ctx, path);
  }
}

export function validate_canHaveEffects(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v46 = v as Record<string, unknown>;
    if (_v46["effect"] !== undefined) {
      validate_effects(_v46["effect"], ctx, path + "/effect");
    }
  }
}

export function validate_fill(v: unknown, ctx: ValidationContext, path: string): void {
  let _v47 = false;
  if (!_v47) {
    const _v48: ValidationContext = { errors: [], partial: ctx.partial };
    validate_colorOrVariable(v, _v48, path);
    if (_v48.errors.length === 0) _v47 = true;
  }
  if (!_v47) {
    if (typeof v !== "object" || v === null) {
      ctx.errors.push({ path: path, message: "expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), \"$variable\", {type: \"color\"}, {type: \"gradient\"}, {type: \"image\"}, {type: \"mesh_gradient\"}" + ", got " + JSON.stringify(v) });
    } else {
      const _v49 = v as Record<string, unknown>;
      switch (_v49["type"]) {
        case "color":
          if (typeof v !== "object" || v === null) {
            ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
          } else {
            const _v50 = v as Record<string, unknown>;
            if (!ctx.partial && !("type" in _v50)) {
              ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v50["type"] !== undefined) {
              if (_v50["type"] !== "color") {
                ctx.errors.push({ path: path + "/type", message: "expected " + "\"color\"" + ", got " + JSON.stringify(_v50["type"]) });
              }
            }
            if (_v50["enabled"] !== undefined) {
              validate_booleanOrVariable(_v50["enabled"], ctx, path + "/enabled");
            }
            if (_v50["blendMode"] !== undefined) {
              validate_blendMode(_v50["blendMode"], ctx, path + "/blendMode");
            }
            if (!ctx.partial && !("color" in _v50)) {
              ctx.errors.push({ path: path + "/color", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v50["color"] !== undefined) {
              const _v51: ValidationContext = { errors: [], partial: ctx.partial };
              validate_colorOrVariable(_v50["color"], _v51, path + "/color");
              if (_v51.errors.length > 0 && ctx.transform) {
                const _v52 = ctx.transform("color", _v50["color"]);
                if (_v52 !== undefined) _v50["color"] = _v52;
                validate_colorOrVariable(_v50["color"], ctx, path + "/color");
              } else {
                for (const _e of _v51.errors) ctx.errors.push(_e);
              }
            }
            for (const _v53 of Object.keys(_v50)) {
              if (_v53 !== "type" && _v53 !== "enabled" && _v53 !== "blendMode" && _v53 !== "color") {
                ctx.errors.push({ path: path + "/" + _v53, message: "unexpected property" + ", got " + JSON.stringify(_v53) });
              }
            }
          }
          break;
        case "gradient":
          if (typeof v !== "object" || v === null) {
            ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
          } else {
            const _v54 = v as Record<string, unknown>;
            if (!ctx.partial && !("type" in _v54)) {
              ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v54["type"] !== undefined) {
              if (_v54["type"] !== "gradient") {
                ctx.errors.push({ path: path + "/type", message: "expected " + "\"gradient\"" + ", got " + JSON.stringify(_v54["type"]) });
              }
            }
            if (_v54["enabled"] !== undefined) {
              validate_booleanOrVariable(_v54["enabled"], ctx, path + "/enabled");
            }
            if (_v54["blendMode"] !== undefined) {
              validate_blendMode(_v54["blendMode"], ctx, path + "/blendMode");
            }
            if (_v54["gradientType"] !== undefined) {
              if (_v54["gradientType"] !== "linear" && _v54["gradientType"] !== "radial" && _v54["gradientType"] !== "angular") {
                ctx.errors.push({ path: path + "/gradientType", message: "expected one of: \"linear\", \"radial\", \"angular\"" + ", got " + JSON.stringify(_v54["gradientType"]) });
              }
            }
            if (_v54["opacity"] !== undefined) {
              validate_numberOrVariable(_v54["opacity"], ctx, path + "/opacity");
            }
            if (_v54["center"] !== undefined) {
              validate_position(_v54["center"], ctx, path + "/center");
            }
            if (_v54["size"] !== undefined) {
              if (typeof _v54["size"] !== "object" || _v54["size"] === null) {
                ctx.errors.push({ path: path + "/size", message: "expected object" + ", got " + JSON.stringify(_v54["size"]) });
              } else {
                const _v55 = _v54["size"] as Record<string, unknown>;
                if (_v55["width"] !== undefined) {
                  validate_numberOrVariable(_v55["width"], ctx, path + "/size" + "/width");
                }
                if (_v55["height"] !== undefined) {
                  validate_numberOrVariable(_v55["height"], ctx, path + "/size" + "/height");
                }
                for (const _v56 of Object.keys(_v55)) {
                  if (_v56 !== "width" && _v56 !== "height") {
                    ctx.errors.push({ path: path + "/size" + "/" + _v56, message: "unexpected property" + ", got " + JSON.stringify(_v56) });
                  }
                }
              }
            }
            if (_v54["rotation"] !== undefined) {
              validate_numberOrVariable(_v54["rotation"], ctx, path + "/rotation");
            }
            if (_v54["colors"] !== undefined) {
              if (!Array.isArray(_v54["colors"])) {
                ctx.errors.push({ path: path + "/colors", message: "expected array" + ", got " + JSON.stringify(_v54["colors"]) });
              } else {
                if (_v54["colors"].length < 1) {
                  ctx.errors.push({ path: path + "/colors", message: "expected at least 1 items" + ", got " + JSON.stringify(_v54["colors"].length) });
                }
                for (let _v57 = 0; _v57 < _v54["colors"].length; _v57++) {
                  if (typeof _v54["colors"][_v57] !== "object" || _v54["colors"][_v57] === null) {
                    ctx.errors.push({ path: path + "/colors" + "/" + _v57, message: "expected object" + ", got " + JSON.stringify(_v54["colors"][_v57]) });
                  } else {
                    const _v58 = _v54["colors"][_v57] as Record<string, unknown>;
                    if (!ctx.partial && !("color" in _v58)) {
                      ctx.errors.push({ path: path + "/colors" + "/" + _v57 + "/color", message: "missing required property" + ", got " + JSON.stringify(_v54["colors"][_v57]) });
                    } else if (_v58["color"] !== undefined) {
                      const _v59: ValidationContext = { errors: [], partial: ctx.partial };
                      validate_colorOrVariable(_v58["color"], _v59, path + "/colors" + "/" + _v57 + "/color");
                      if (_v59.errors.length > 0 && ctx.transform) {
                        const _v60 = ctx.transform("color", _v58["color"]);
                        if (_v60 !== undefined) _v58["color"] = _v60;
                        validate_colorOrVariable(_v58["color"], ctx, path + "/colors" + "/" + _v57 + "/color");
                      } else {
                        for (const _e of _v59.errors) ctx.errors.push(_e);
                      }
                    }
                    if (!ctx.partial && !("position" in _v58)) {
                      ctx.errors.push({ path: path + "/colors" + "/" + _v57 + "/position", message: "missing required property" + ", got " + JSON.stringify(_v54["colors"][_v57]) });
                    } else if (_v58["position"] !== undefined) {
                      validate_numberOrVariable(_v58["position"], ctx, path + "/colors" + "/" + _v57 + "/position");
                    }
                    for (const _v61 of Object.keys(_v58)) {
                      if (_v61 !== "color" && _v61 !== "position") {
                        ctx.errors.push({ path: path + "/colors" + "/" + _v57 + "/" + _v61, message: "unexpected property" + ", got " + JSON.stringify(_v61) });
                      }
                    }
                  }
                }
              }
            }
            for (const _v62 of Object.keys(_v54)) {
              if (_v62 !== "type" && _v62 !== "enabled" && _v62 !== "blendMode" && _v62 !== "gradientType" && _v62 !== "opacity" && _v62 !== "center" && _v62 !== "size" && _v62 !== "rotation" && _v62 !== "colors") {
                ctx.errors.push({ path: path + "/" + _v62, message: "unexpected property" + ", got " + JSON.stringify(_v62) });
              }
            }
          }
          break;
        case "image":
          if (typeof v !== "object" || v === null) {
            ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
          } else {
            const _v63 = v as Record<string, unknown>;
            if (!ctx.partial && !("type" in _v63)) {
              ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v63["type"] !== undefined) {
              if (_v63["type"] !== "image") {
                ctx.errors.push({ path: path + "/type", message: "expected " + "\"image\"" + ", got " + JSON.stringify(_v63["type"]) });
              }
            }
            if (_v63["enabled"] !== undefined) {
              validate_booleanOrVariable(_v63["enabled"], ctx, path + "/enabled");
            }
            if (_v63["blendMode"] !== undefined) {
              validate_blendMode(_v63["blendMode"], ctx, path + "/blendMode");
            }
            if (_v63["opacity"] !== undefined) {
              validate_numberOrVariable(_v63["opacity"], ctx, path + "/opacity");
            }
            if (!ctx.partial && !("url" in _v63)) {
              ctx.errors.push({ path: path + "/url", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v63["url"] !== undefined) {
              if (typeof _v63["url"] !== "string") {
                ctx.errors.push({ path: path + "/url", message: "expected string" + ", got " + JSON.stringify(_v63["url"]) });
              }
            }
            if (_v63["mode"] !== undefined) {
              if (_v63["mode"] !== "stretch" && _v63["mode"] !== "fill" && _v63["mode"] !== "fit") {
                ctx.errors.push({ path: path + "/mode", message: "expected one of: \"stretch\", \"fill\", \"fit\"" + ", got " + JSON.stringify(_v63["mode"]) });
              }
            }
            for (const _v64 of Object.keys(_v63)) {
              if (_v64 !== "type" && _v64 !== "enabled" && _v64 !== "blendMode" && _v64 !== "opacity" && _v64 !== "url" && _v64 !== "mode") {
                ctx.errors.push({ path: path + "/" + _v64, message: "unexpected property" + ", got " + JSON.stringify(_v64) });
              }
            }
          }
          break;
        case "mesh_gradient":
          if (typeof v !== "object" || v === null) {
            ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
          } else {
            const _v65 = v as Record<string, unknown>;
            if (!ctx.partial && !("type" in _v65)) {
              ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
            } else if (_v65["type"] !== undefined) {
              if (_v65["type"] !== "mesh_gradient") {
                ctx.errors.push({ path: path + "/type", message: "expected " + "\"mesh_gradient\"" + ", got " + JSON.stringify(_v65["type"]) });
              }
            }
            if (_v65["enabled"] !== undefined) {
              validate_booleanOrVariable(_v65["enabled"], ctx, path + "/enabled");
            }
            if (_v65["blendMode"] !== undefined) {
              validate_blendMode(_v65["blendMode"], ctx, path + "/blendMode");
            }
            if (_v65["opacity"] !== undefined) {
              validate_numberOrVariable(_v65["opacity"], ctx, path + "/opacity");
            }
            if (_v65["columns"] !== undefined) {
              if (typeof _v65["columns"] !== "number") {
                ctx.errors.push({ path: path + "/columns", message: "expected number" + ", got " + JSON.stringify(_v65["columns"]) });
              }
            }
            if (_v65["rows"] !== undefined) {
              if (typeof _v65["rows"] !== "number") {
                ctx.errors.push({ path: path + "/rows", message: "expected number" + ", got " + JSON.stringify(_v65["rows"]) });
              }
            }
            if (_v65["colors"] !== undefined) {
              if (!Array.isArray(_v65["colors"])) {
                ctx.errors.push({ path: path + "/colors", message: "expected array" + ", got " + JSON.stringify(_v65["colors"]) });
              } else {
                for (let _v66 = 0; _v66 < _v65["colors"].length; _v66++) {
                  const _v67: ValidationContext = { errors: [], partial: ctx.partial };
                  validate_colorOrVariable(_v65["colors"][_v66], _v67, path + "/colors" + "/" + _v66);
                  if (_v67.errors.length > 0 && ctx.transform) {
                    const _v68 = ctx.transform("color", _v65["colors"][_v66]);
                    if (_v68 !== undefined) _v65["colors"][_v66] = _v68;
                    validate_colorOrVariable(_v65["colors"][_v66], ctx, path + "/colors" + "/" + _v66);
                  } else {
                    for (const _e of _v67.errors) ctx.errors.push(_e);
                  }
                }
              }
            }
            if (_v65["points"] !== undefined) {
              if (!Array.isArray(_v65["points"])) {
                ctx.errors.push({ path: path + "/points", message: "expected array" + ", got " + JSON.stringify(_v65["points"]) });
              } else {
                for (let _v69 = 0; _v69 < _v65["points"].length; _v69++) {
                  if (Array.isArray(_v65["points"][_v69])) {
                    if (_v65["points"][_v69].length !== 2) {
                      ctx.errors.push({ path: path + "/points" + "/" + _v69, message: "expected either number[2] or object" + ", got " + JSON.stringify(_v65["points"][_v69]) });
                    } else {
                      for (let _v70 = 0; _v70 < _v65["points"][_v69].length; _v70++) {
                        if (typeof _v65["points"][_v69][_v70] !== "number") {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/" + _v70, message: "expected number" + ", got " + JSON.stringify(_v65["points"][_v69][_v70]) });
                        }
                      }
                    }
                  } else if (typeof _v65["points"][_v69] === "object" && _v65["points"][_v69] !== null) {
                    const _v71 = _v65["points"][_v69] as Record<string, unknown>;
                    if (!ctx.partial && !("position" in _v71)) {
                      ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/position", message: "missing required property" + ", got " + JSON.stringify(_v65["points"][_v69]) });
                    } else if (_v71["position"] !== undefined) {
                      if (!Array.isArray(_v71["position"])) {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/position", message: "expected number[2]" + ", got " + JSON.stringify(_v71["position"]) });
                      } else {
                        if (_v71["position"].length !== 2) {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/position", message: "expected number[2]" + ", got " + JSON.stringify(_v71["position"]) });
                        } else {
                          for (let _v72 = 0; _v72 < _v71["position"].length; _v72++) {
                            if (typeof _v71["position"][_v72] !== "number") {
                              ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/position" + "/" + _v72, message: "expected number" + ", got " + JSON.stringify(_v71["position"][_v72]) });
                            }
                          }
                        }
                      }
                    }
                    if (_v71["leftHandle"] !== undefined) {
                      if (!Array.isArray(_v71["leftHandle"])) {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/leftHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["leftHandle"]) });
                      } else {
                        if (_v71["leftHandle"].length !== 2) {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/leftHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["leftHandle"]) });
                        } else {
                          for (let _v73 = 0; _v73 < _v71["leftHandle"].length; _v73++) {
                            if (typeof _v71["leftHandle"][_v73] !== "number") {
                              ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/leftHandle" + "/" + _v73, message: "expected number" + ", got " + JSON.stringify(_v71["leftHandle"][_v73]) });
                            }
                          }
                        }
                      }
                    }
                    if (_v71["rightHandle"] !== undefined) {
                      if (!Array.isArray(_v71["rightHandle"])) {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/rightHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["rightHandle"]) });
                      } else {
                        if (_v71["rightHandle"].length !== 2) {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/rightHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["rightHandle"]) });
                        } else {
                          for (let _v74 = 0; _v74 < _v71["rightHandle"].length; _v74++) {
                            if (typeof _v71["rightHandle"][_v74] !== "number") {
                              ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/rightHandle" + "/" + _v74, message: "expected number" + ", got " + JSON.stringify(_v71["rightHandle"][_v74]) });
                            }
                          }
                        }
                      }
                    }
                    if (_v71["topHandle"] !== undefined) {
                      if (!Array.isArray(_v71["topHandle"])) {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/topHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["topHandle"]) });
                      } else {
                        if (_v71["topHandle"].length !== 2) {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/topHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["topHandle"]) });
                        } else {
                          for (let _v75 = 0; _v75 < _v71["topHandle"].length; _v75++) {
                            if (typeof _v71["topHandle"][_v75] !== "number") {
                              ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/topHandle" + "/" + _v75, message: "expected number" + ", got " + JSON.stringify(_v71["topHandle"][_v75]) });
                            }
                          }
                        }
                      }
                    }
                    if (_v71["bottomHandle"] !== undefined) {
                      if (!Array.isArray(_v71["bottomHandle"])) {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/bottomHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["bottomHandle"]) });
                      } else {
                        if (_v71["bottomHandle"].length !== 2) {
                          ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/bottomHandle", message: "expected number[2]" + ", got " + JSON.stringify(_v71["bottomHandle"]) });
                        } else {
                          for (let _v76 = 0; _v76 < _v71["bottomHandle"].length; _v76++) {
                            if (typeof _v71["bottomHandle"][_v76] !== "number") {
                              ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/bottomHandle" + "/" + _v76, message: "expected number" + ", got " + JSON.stringify(_v71["bottomHandle"][_v76]) });
                            }
                          }
                        }
                      }
                    }
                    for (const _v77 of Object.keys(_v71)) {
                      if (_v77 !== "position" && _v77 !== "leftHandle" && _v77 !== "rightHandle" && _v77 !== "topHandle" && _v77 !== "bottomHandle") {
                        ctx.errors.push({ path: path + "/points" + "/" + _v69 + "/" + _v77, message: "unexpected property" + ", got " + JSON.stringify(_v77) });
                      }
                    }
                  } else {
                    ctx.errors.push({ path: path + "/points" + "/" + _v69, message: "expected either number[2] or object" + ", got " + JSON.stringify(_v65["points"][_v69]) });
                  }
                }
              }
            }
            for (const _v78 of Object.keys(_v65)) {
              if (_v78 !== "type" && _v78 !== "enabled" && _v78 !== "blendMode" && _v78 !== "opacity" && _v78 !== "columns" && _v78 !== "rows" && _v78 !== "colors" && _v78 !== "points") {
                ctx.errors.push({ path: path + "/" + _v78, message: "unexpected property" + ", got " + JSON.stringify(_v78) });
              }
            }
          }
          break;
        default:
          ctx.errors.push({ path: path + "/type", message: "expected one of: \"color\", \"gradient\", \"image\", \"mesh_gradient\"" + ", got " + JSON.stringify(_v49["type"]) });
      }
    }
  }
}

export function validate_fills(v: unknown, ctx: ValidationContext, path: string): void {
  if (Array.isArray(v)) {
    for (let _v79 = 0; _v79 < v.length; _v79++) {
      const _v80: ValidationContext = { errors: [], partial: ctx.partial };
      validate_fill(v[_v79], _v80, path + "/" + _v79);
      if (_v80.errors.length > 0 && ctx.transform) {
        const _v81 = ctx.transform("color", v[_v79]);
        if (_v81 !== undefined) v[_v79] = _v81;
        validate_fill(v[_v79], ctx, path + "/" + _v79);
      } else {
        for (const _e of _v80.errors) ctx.errors.push(_e);
      }
    }
  } else {
    validate_fill(v, ctx, path);
  }
}

export function validate_stroke(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v82 = v as Record<string, unknown>;
    if (_v82["align"] !== undefined) {
      if (_v82["align"] !== "inside" && _v82["align"] !== "center" && _v82["align"] !== "outside") {
        ctx.errors.push({ path: path + "/align", message: "expected one of: \"inside\", \"center\", \"outside\"" + ", got " + JSON.stringify(_v82["align"]) });
      }
    }
    if (_v82["thickness"] !== undefined) {
      let _v83 = false;
      if (!_v83) {
        const _v84: ValidationContext = { errors: [], partial: ctx.partial };
        validate_numberOrVariable(_v82["thickness"], _v84, path + "/thickness");
        if (_v84.errors.length === 0) _v83 = true;
      }
      if (!_v83) {
        const _v85: ValidationContext = { errors: [], partial: ctx.partial };
        if (typeof _v82["thickness"] !== "object" || _v82["thickness"] === null) {
          _v85.errors.push({ path: path + "/thickness", message: "expected object" + ", got " + JSON.stringify(_v82["thickness"]) });
        } else {
          const _v86 = _v82["thickness"] as Record<string, unknown>;
          if (_v86["top"] !== undefined) {
            validate_numberOrVariable(_v86["top"], _v85, path + "/thickness" + "/top");
          }
          if (_v86["right"] !== undefined) {
            validate_numberOrVariable(_v86["right"], _v85, path + "/thickness" + "/right");
          }
          if (_v86["bottom"] !== undefined) {
            validate_numberOrVariable(_v86["bottom"], _v85, path + "/thickness" + "/bottom");
          }
          if (_v86["left"] !== undefined) {
            validate_numberOrVariable(_v86["left"], _v85, path + "/thickness" + "/left");
          }
          for (const _v87 of Object.keys(_v86)) {
            if (_v87 !== "top" && _v87 !== "right" && _v87 !== "bottom" && _v87 !== "left") {
              _v85.errors.push({ path: path + "/thickness" + "/" + _v87, message: "unexpected property" + ", got " + JSON.stringify(_v87) });
            }
          }
        }
        if (_v85.errors.length === 0) _v83 = true;
      }
      if (!_v83) {
        ctx.errors.push({ path: path + "/thickness", message: "expected one of: number, \"$variable\", object" + ", got " + JSON.stringify(_v82["thickness"]) });
      }
    }
    if (_v82["join"] !== undefined) {
      if (_v82["join"] !== "miter" && _v82["join"] !== "bevel" && _v82["join"] !== "round") {
        ctx.errors.push({ path: path + "/join", message: "expected one of: \"miter\", \"bevel\", \"round\"" + ", got " + JSON.stringify(_v82["join"]) });
      }
    }
    if (_v82["miterAngle"] !== undefined) {
      validate_numberOrVariable(_v82["miterAngle"], ctx, path + "/miterAngle");
    }
    if (_v82["cap"] !== undefined) {
      if (_v82["cap"] !== "none" && _v82["cap"] !== "round" && _v82["cap"] !== "square") {
        ctx.errors.push({ path: path + "/cap", message: "expected one of: \"none\", \"round\", \"square\"" + ", got " + JSON.stringify(_v82["cap"]) });
      }
    }
    if (_v82["dashPattern"] !== undefined) {
      if (!Array.isArray(_v82["dashPattern"])) {
        ctx.errors.push({ path: path + "/dashPattern", message: "expected array" + ", got " + JSON.stringify(_v82["dashPattern"]) });
      } else {
        for (let _v88 = 0; _v88 < _v82["dashPattern"].length; _v88++) {
          if (typeof _v82["dashPattern"][_v88] !== "number") {
            ctx.errors.push({ path: path + "/dashPattern" + "/" + _v88, message: "expected number" + ", got " + JSON.stringify(_v82["dashPattern"][_v88]) });
          }
        }
      }
    }
    if (_v82["fill"] !== undefined) {
      const _v89: ValidationContext = { errors: [], partial: ctx.partial };
      validate_fills(_v82["fill"], _v89, path + "/fill");
      if (_v89.errors.length > 0 && ctx.transform) {
        const _v90 = ctx.transform("color", _v82["fill"]);
        if (_v90 !== undefined) _v82["fill"] = _v90;
        validate_fills(_v82["fill"], ctx, path + "/fill");
      } else {
        for (const _e of _v89.errors) ctx.errors.push(_e);
      }
    }
    for (const _v91 of Object.keys(_v82)) {
      if (_v91 !== "align" && _v91 !== "thickness" && _v91 !== "join" && _v91 !== "miterAngle" && _v91 !== "cap" && _v91 !== "dashPattern" && _v91 !== "fill") {
        ctx.errors.push({ path: path + "/" + _v91, message: "unexpected property" + ", got " + JSON.stringify(_v91) });
      }
    }
  }
}

export function validate_canHaveGraphics(v: unknown, ctx: ValidationContext, path: string): void {
  validate_canHaveEffects(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v92 = v as Record<string, unknown>;
    if (_v92["stroke"] !== undefined) {
      validate_stroke(_v92["stroke"], ctx, path + "/stroke");
    }
    if (_v92["fill"] !== undefined) {
      const _v93: ValidationContext = { errors: [], partial: ctx.partial };
      validate_fills(_v92["fill"], _v93, path + "/fill");
      if (_v93.errors.length > 0 && ctx.transform) {
        const _v94 = ctx.transform("color", _v92["fill"]);
        if (_v94 !== undefined) _v92["fill"] = _v94;
        validate_fills(_v92["fill"], ctx, path + "/fill");
      } else {
        for (const _e of _v93.errors) ctx.errors.push(_e);
      }
    }
  }
}

export function validate_rectangleish(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v95 = v as Record<string, unknown>;
    if (_v95["cornerRadius"] !== undefined) {
      if (Array.isArray(_v95["cornerRadius"])) {
        if (_v95["cornerRadius"].length !== 4) {
          ctx.errors.push({ path: path + "/cornerRadius", message: "expected one of: number, \"$variable\", (number | \"$variable\")[4]" + ", got " + JSON.stringify(_v95["cornerRadius"]) });
        } else {
          for (let _v96 = 0; _v96 < _v95["cornerRadius"].length; _v96++) {
            validate_numberOrVariable(_v95["cornerRadius"][_v96], ctx, path + "/cornerRadius" + "/" + _v96);
          }
        }
      } else {
        const _v97: ValidationContext = { errors: [], partial: ctx.partial };
        let _v98 = false;
        if (!_v98) {
          const _v99: ValidationContext = { errors: [], partial: _v97.partial };
          validate_numberOrVariable(_v95["cornerRadius"], _v99, path + "/cornerRadius");
          if (_v99.errors.length === 0) _v98 = true;
        }
        if (!_v98) {
          _v97.errors.push({ path: path + "/cornerRadius", message: "expected either number or \"$variable\"" + ", got " + JSON.stringify(_v95["cornerRadius"]) });
        }
        if (_v97.errors.length > 0) {
          ctx.errors.push({ path: path + "/cornerRadius", message: "expected one of: number, \"$variable\", (number | \"$variable\")[4]" + ", got " + JSON.stringify(_v95["cornerRadius"]) });
        }
      }
    }
  }
}

export function validate_layout(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v100 = v as Record<string, unknown>;
    if (_v100["layout"] !== undefined) {
      if (_v100["layout"] !== "none" && _v100["layout"] !== "vertical" && _v100["layout"] !== "horizontal") {
        ctx.errors.push({ path: path + "/layout", message: "expected one of: \"none\", \"vertical\", \"horizontal\"" + ", got " + JSON.stringify(_v100["layout"]) });
      }
    }
    if (_v100["gap"] !== undefined) {
      validate_numberOrVariable(_v100["gap"], ctx, path + "/gap");
    }
    if (_v100["layoutIncludeStroke"] !== undefined) {
      if (typeof _v100["layoutIncludeStroke"] !== "boolean") {
        ctx.errors.push({ path: path + "/layoutIncludeStroke", message: "expected boolean" + ", got " + JSON.stringify(_v100["layoutIncludeStroke"]) });
      }
    }
    if (_v100["padding"] !== undefined) {
      if (Array.isArray(_v100["padding"])) {
        let _v101 = false;
        if (!_v101) {
          const _v102: ValidationContext = { errors: [], partial: ctx.partial };
          if (_v100["padding"].length !== 2) {
            _v102.errors.push({ path: path + "/padding", message: "expected (number | \"$variable\")[2]" + ", got " + JSON.stringify(_v100["padding"]) });
          } else {
            for (let _v103 = 0; _v103 < _v100["padding"].length; _v103++) {
              validate_numberOrVariable(_v100["padding"][_v103], _v102, path + "/padding" + "/" + _v103);
            }
          }
          if (_v102.errors.length === 0) _v101 = true;
        }
        if (!_v101) {
          const _v104: ValidationContext = { errors: [], partial: ctx.partial };
          if (_v100["padding"].length !== 4) {
            _v104.errors.push({ path: path + "/padding", message: "expected (number | \"$variable\")[4]" + ", got " + JSON.stringify(_v100["padding"]) });
          } else {
            for (let _v105 = 0; _v105 < _v100["padding"].length; _v105++) {
              validate_numberOrVariable(_v100["padding"][_v105], _v104, path + "/padding" + "/" + _v105);
            }
          }
          if (_v104.errors.length === 0) _v101 = true;
        }
        if (!_v101) {
          ctx.errors.push({ path: path + "/padding", message: "expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable" + ", got " + JSON.stringify(_v100["padding"]) });
        }
      } else {
        const _v106: ValidationContext = { errors: [], partial: ctx.partial };
        let _v107 = false;
        if (!_v107) {
          const _v108: ValidationContext = { errors: [], partial: _v106.partial };
          validate_numberOrVariable(_v100["padding"], _v108, path + "/padding");
          if (_v108.errors.length === 0) _v107 = true;
        }
        if (!_v107) {
          _v106.errors.push({ path: path + "/padding", message: "expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable" + ", got " + JSON.stringify(_v100["padding"]) });
        }
        if (_v106.errors.length > 0) {
          ctx.errors.push({ path: path + "/padding", message: "expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable" + ", got " + JSON.stringify(_v100["padding"]) });
        }
      }
    }
    if (_v100["justifyContent"] !== undefined) {
      const _v109: ValidationContext = { errors: [], partial: ctx.partial };
      if (_v100["justifyContent"] !== "start" && _v100["justifyContent"] !== "center" && _v100["justifyContent"] !== "end" && _v100["justifyContent"] !== "space_between" && _v100["justifyContent"] !== "space_around") {
        _v109.errors.push({ path: path + "/justifyContent", message: "expected one of: \"start\", \"center\", \"end\", \"space_between\", \"space_around\"" + ", got " + JSON.stringify(_v100["justifyContent"]) });
      }
      if (_v109.errors.length > 0 && ctx.transform) {
        const _v110 = ctx.transform("justifyContent", _v100["justifyContent"]);
        if (_v110 !== undefined) _v100["justifyContent"] = _v110;
        if (_v100["justifyContent"] !== "start" && _v100["justifyContent"] !== "center" && _v100["justifyContent"] !== "end" && _v100["justifyContent"] !== "space_between" && _v100["justifyContent"] !== "space_around") {
          ctx.errors.push({ path: path + "/justifyContent", message: "expected one of: \"start\", \"center\", \"end\", \"space_between\", \"space_around\"" + ", got " + JSON.stringify(_v100["justifyContent"]) });
        }
      } else {
        for (const _e of _v109.errors) ctx.errors.push(_e);
      }
    }
    if (_v100["alignItems"] !== undefined) {
      const _v111: ValidationContext = { errors: [], partial: ctx.partial };
      if (_v100["alignItems"] !== "start" && _v100["alignItems"] !== "center" && _v100["alignItems"] !== "end") {
        _v111.errors.push({ path: path + "/alignItems", message: "expected one of: \"start\", \"center\", \"end\"" + ", got " + JSON.stringify(_v100["alignItems"]) });
      }
      if (_v111.errors.length > 0 && ctx.transform) {
        const _v112 = ctx.transform("alignItems", _v100["alignItems"]);
        if (_v112 !== undefined) _v100["alignItems"] = _v112;
        if (_v100["alignItems"] !== "start" && _v100["alignItems"] !== "center" && _v100["alignItems"] !== "end") {
          ctx.errors.push({ path: path + "/alignItems", message: "expected one of: \"start\", \"center\", \"end\"" + ", got " + JSON.stringify(_v100["alignItems"]) });
        }
      } else {
        for (const _e of _v111.errors) ctx.errors.push(_e);
      }
    }
  }
}

export function validate_group(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_canHaveChildren(v, ctx, path);
  validate_canHaveEffects(v, ctx, path);
  validate_layout(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v113 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v113)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v113["type"] !== undefined) {
      if (_v113["type"] !== "group") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"group\"" + ", got " + JSON.stringify(_v113["type"]) });
      }
    }
    if (_v113["width"] !== undefined) {
      const _v114: ValidationContext = { errors: [], partial: ctx.partial };
      validate_sizingBehavior(_v113["width"], _v114, path + "/width");
      if (_v114.errors.length > 0 && ctx.transform) {
        const _v115 = ctx.transform("sizingBehavior", _v113["width"]);
        if (_v115 !== undefined) _v113["width"] = _v115;
        validate_sizingBehavior(_v113["width"], ctx, path + "/width");
      } else {
        for (const _e of _v114.errors) ctx.errors.push(_e);
      }
    }
    if (_v113["height"] !== undefined) {
      const _v116: ValidationContext = { errors: [], partial: ctx.partial };
      validate_sizingBehavior(_v113["height"], _v116, path + "/height");
      if (_v116.errors.length > 0 && ctx.transform) {
        const _v117 = ctx.transform("sizingBehavior", _v113["height"]);
        if (_v117 !== undefined) _v113["height"] = _v117;
        validate_sizingBehavior(_v113["height"], ctx, path + "/height");
      } else {
        for (const _e of _v116.errors) ctx.errors.push(_e);
      }
    }
    for (const _v118 of Object.keys(_v113)) {
      if (_v118 !== "type" && _v118 !== "width" && _v118 !== "height" && _v118 !== "x" && _v118 !== "y" && _v118 !== "id" && _v118 !== "name" && _v118 !== "context" && _v118 !== "reusable" && _v118 !== "theme" && _v118 !== "enabled" && _v118 !== "opacity" && _v118 !== "flipX" && _v118 !== "flipY" && _v118 !== "layoutPosition" && _v118 !== "metadata" && _v118 !== "rotation" && _v118 !== "children" && _v118 !== "effect" && _v118 !== "layout" && _v118 !== "gap" && _v118 !== "layoutIncludeStroke" && _v118 !== "padding" && _v118 !== "justifyContent" && _v118 !== "alignItems") {
        ctx.errors.push({ path: path + "/" + _v118, message: "unexpected property" + ", got " + JSON.stringify(_v118) });
      }
    }
  }
}

export function validate_rectangle(v: unknown, ctx: ValidationContext, path: string): void {
  validate_rectangleish(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v119 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v119)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v119["type"] !== undefined) {
      if (_v119["type"] !== "rectangle") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"rectangle\"" + ", got " + JSON.stringify(_v119["type"]) });
      }
    }
    for (const _v120 of Object.keys(_v119)) {
      if (_v120 !== "type" && _v120 !== "x" && _v120 !== "y" && _v120 !== "id" && _v120 !== "name" && _v120 !== "context" && _v120 !== "reusable" && _v120 !== "theme" && _v120 !== "enabled" && _v120 !== "opacity" && _v120 !== "flipX" && _v120 !== "flipY" && _v120 !== "layoutPosition" && _v120 !== "metadata" && _v120 !== "rotation" && _v120 !== "width" && _v120 !== "height" && _v120 !== "effect" && _v120 !== "stroke" && _v120 !== "fill" && _v120 !== "cornerRadius") {
        ctx.errors.push({ path: path + "/" + _v120, message: "unexpected property" + ", got " + JSON.stringify(_v120) });
      }
    }
  }
}

export function validate_ellipse(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v121 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v121)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v121["type"] !== undefined) {
      if (_v121["type"] !== "ellipse") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"ellipse\"" + ", got " + JSON.stringify(_v121["type"]) });
      }
    }
    if (_v121["innerRadius"] !== undefined) {
      validate_numberOrVariable(_v121["innerRadius"], ctx, path + "/innerRadius");
    }
    if (_v121["startAngle"] !== undefined) {
      validate_numberOrVariable(_v121["startAngle"], ctx, path + "/startAngle");
    }
    if (_v121["sweepAngle"] !== undefined) {
      validate_numberOrVariable(_v121["sweepAngle"], ctx, path + "/sweepAngle");
    }
    for (const _v122 of Object.keys(_v121)) {
      if (_v122 !== "type" && _v122 !== "innerRadius" && _v122 !== "startAngle" && _v122 !== "sweepAngle" && _v122 !== "x" && _v122 !== "y" && _v122 !== "id" && _v122 !== "name" && _v122 !== "context" && _v122 !== "reusable" && _v122 !== "theme" && _v122 !== "enabled" && _v122 !== "opacity" && _v122 !== "flipX" && _v122 !== "flipY" && _v122 !== "layoutPosition" && _v122 !== "metadata" && _v122 !== "rotation" && _v122 !== "width" && _v122 !== "height" && _v122 !== "effect" && _v122 !== "stroke" && _v122 !== "fill") {
        ctx.errors.push({ path: path + "/" + _v122, message: "unexpected property" + ", got " + JSON.stringify(_v122) });
      }
    }
  }
}

export function validate_line(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v123 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v123)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v123["type"] !== undefined) {
      if (_v123["type"] !== "line") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"line\"" + ", got " + JSON.stringify(_v123["type"]) });
      }
    }
    for (const _v124 of Object.keys(_v123)) {
      if (_v124 !== "type" && _v124 !== "x" && _v124 !== "y" && _v124 !== "id" && _v124 !== "name" && _v124 !== "context" && _v124 !== "reusable" && _v124 !== "theme" && _v124 !== "enabled" && _v124 !== "opacity" && _v124 !== "flipX" && _v124 !== "flipY" && _v124 !== "layoutPosition" && _v124 !== "metadata" && _v124 !== "rotation" && _v124 !== "width" && _v124 !== "height" && _v124 !== "effect" && _v124 !== "stroke" && _v124 !== "fill") {
        ctx.errors.push({ path: path + "/" + _v124, message: "unexpected property" + ", got " + JSON.stringify(_v124) });
      }
    }
  }
}

export function validate_path(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v125 = v as Record<string, unknown>;
    if (_v125["fillRule"] !== undefined) {
      if (_v125["fillRule"] !== "nonzero" && _v125["fillRule"] !== "evenodd") {
        ctx.errors.push({ path: path + "/fillRule", message: "expected one of: \"nonzero\", \"evenodd\"" + ", got " + JSON.stringify(_v125["fillRule"]) });
      }
    }
    if (_v125["geometry"] !== undefined) {
      if (typeof _v125["geometry"] !== "string") {
        ctx.errors.push({ path: path + "/geometry", message: "expected string" + ", got " + JSON.stringify(_v125["geometry"]) });
      }
    }
  }
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v126 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v126)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v126["type"] !== undefined) {
      if (_v126["type"] !== "path") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"path\"" + ", got " + JSON.stringify(_v126["type"]) });
      }
    }
    for (const _v127 of Object.keys(_v126)) {
      if (_v127 !== "type" && _v127 !== "x" && _v127 !== "y" && _v127 !== "id" && _v127 !== "name" && _v127 !== "context" && _v127 !== "reusable" && _v127 !== "theme" && _v127 !== "enabled" && _v127 !== "opacity" && _v127 !== "flipX" && _v127 !== "flipY" && _v127 !== "layoutPosition" && _v127 !== "metadata" && _v127 !== "rotation" && _v127 !== "width" && _v127 !== "height" && _v127 !== "effect" && _v127 !== "stroke" && _v127 !== "fill" && _v127 !== "fillRule" && _v127 !== "geometry") {
        ctx.errors.push({ path: path + "/" + _v127, message: "unexpected property" + ", got " + JSON.stringify(_v127) });
      }
    }
  }
}

export function validate_polygon(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v128 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v128)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v128["type"] !== undefined) {
      if (_v128["type"] !== "polygon") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"polygon\"" + ", got " + JSON.stringify(_v128["type"]) });
      }
    }
    if (_v128["polygonCount"] !== undefined) {
      validate_numberOrVariable(_v128["polygonCount"], ctx, path + "/polygonCount");
    }
    if (_v128["cornerRadius"] !== undefined) {
      validate_numberOrVariable(_v128["cornerRadius"], ctx, path + "/cornerRadius");
    }
    for (const _v129 of Object.keys(_v128)) {
      if (_v129 !== "type" && _v129 !== "polygonCount" && _v129 !== "cornerRadius" && _v129 !== "x" && _v129 !== "y" && _v129 !== "id" && _v129 !== "name" && _v129 !== "context" && _v129 !== "reusable" && _v129 !== "theme" && _v129 !== "enabled" && _v129 !== "opacity" && _v129 !== "flipX" && _v129 !== "flipY" && _v129 !== "layoutPosition" && _v129 !== "metadata" && _v129 !== "rotation" && _v129 !== "width" && _v129 !== "height" && _v129 !== "effect" && _v129 !== "stroke" && _v129 !== "fill") {
        ctx.errors.push({ path: path + "/" + _v129, message: "unexpected property" + ", got " + JSON.stringify(_v129) });
      }
    }
  }
}

export function validate_textStyle(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v130 = v as Record<string, unknown>;
    if (_v130["fontFamily"] !== undefined) {
      validate_stringOrVariable(_v130["fontFamily"], ctx, path + "/fontFamily");
    }
    if (_v130["fontSize"] !== undefined) {
      validate_numberOrVariable(_v130["fontSize"], ctx, path + "/fontSize");
    }
    if (_v130["fontWeight"] !== undefined) {
      const _v131: ValidationContext = { errors: [], partial: ctx.partial };
      validate_stringOrVariable(_v130["fontWeight"], _v131, path + "/fontWeight");
      if (_v131.errors.length > 0 && ctx.transform) {
        const _v132 = ctx.transform("fontWeight", _v130["fontWeight"]);
        if (_v132 !== undefined) _v130["fontWeight"] = _v132;
        validate_stringOrVariable(_v130["fontWeight"], ctx, path + "/fontWeight");
      } else {
        for (const _e of _v131.errors) ctx.errors.push(_e);
      }
    }
    if (_v130["letterSpacing"] !== undefined) {
      validate_numberOrVariable(_v130["letterSpacing"], ctx, path + "/letterSpacing");
    }
    if (_v130["fontStyle"] !== undefined) {
      validate_stringOrVariable(_v130["fontStyle"], ctx, path + "/fontStyle");
    }
    if (_v130["underline"] !== undefined) {
      validate_booleanOrVariable(_v130["underline"], ctx, path + "/underline");
    }
    if (_v130["lineHeight"] !== undefined) {
      validate_numberOrVariable(_v130["lineHeight"], ctx, path + "/lineHeight");
    }
    if (_v130["textAlign"] !== undefined) {
      const _v133: ValidationContext = { errors: [], partial: ctx.partial };
      if (_v130["textAlign"] !== "left" && _v130["textAlign"] !== "center" && _v130["textAlign"] !== "right" && _v130["textAlign"] !== "justify") {
        _v133.errors.push({ path: path + "/textAlign", message: "expected one of: \"left\", \"center\", \"right\", \"justify\"" + ", got " + JSON.stringify(_v130["textAlign"]) });
      }
      if (_v133.errors.length > 0 && ctx.transform) {
        const _v134 = ctx.transform("textAlign", _v130["textAlign"]);
        if (_v134 !== undefined) _v130["textAlign"] = _v134;
        if (_v130["textAlign"] !== "left" && _v130["textAlign"] !== "center" && _v130["textAlign"] !== "right" && _v130["textAlign"] !== "justify") {
          ctx.errors.push({ path: path + "/textAlign", message: "expected one of: \"left\", \"center\", \"right\", \"justify\"" + ", got " + JSON.stringify(_v130["textAlign"]) });
        }
      } else {
        for (const _e of _v133.errors) ctx.errors.push(_e);
      }
    }
    if (_v130["textAlignVertical"] !== undefined) {
      const _v135: ValidationContext = { errors: [], partial: ctx.partial };
      if (_v130["textAlignVertical"] !== "top" && _v130["textAlignVertical"] !== "middle" && _v130["textAlignVertical"] !== "bottom") {
        _v135.errors.push({ path: path + "/textAlignVertical", message: "expected one of: \"top\", \"middle\", \"bottom\"" + ", got " + JSON.stringify(_v130["textAlignVertical"]) });
      }
      if (_v135.errors.length > 0 && ctx.transform) {
        const _v136 = ctx.transform("textAlignVertical", _v130["textAlignVertical"]);
        if (_v136 !== undefined) _v130["textAlignVertical"] = _v136;
        if (_v130["textAlignVertical"] !== "top" && _v130["textAlignVertical"] !== "middle" && _v130["textAlignVertical"] !== "bottom") {
          ctx.errors.push({ path: path + "/textAlignVertical", message: "expected one of: \"top\", \"middle\", \"bottom\"" + ", got " + JSON.stringify(_v130["textAlignVertical"]) });
        }
      } else {
        for (const _e of _v135.errors) ctx.errors.push(_e);
      }
    }
    if (_v130["strikethrough"] !== undefined) {
      validate_booleanOrVariable(_v130["strikethrough"], ctx, path + "/strikethrough");
    }
    if (_v130["href"] !== undefined) {
      if (typeof _v130["href"] !== "string") {
        ctx.errors.push({ path: path + "/href", message: "expected string" + ", got " + JSON.stringify(_v130["href"]) });
      }
    }
  }
}

export function validate_textContent(v: unknown, ctx: ValidationContext, path: string): void {
  if (Array.isArray(v)) {
    for (let _v137 = 0; _v137 < v.length; _v137++) {
      validate_textStyle(v[_v137], ctx, path + "/" + _v137);
      if (typeof v[_v137] !== "object" || v[_v137] === null) {
        ctx.errors.push({ path: path + "/" + _v137, message: "expected object" + ", got " + JSON.stringify(v[_v137]) });
      } else {
        const _v138 = v[_v137] as Record<string, unknown>;
        if (_v138["content"] !== undefined) {
          if (typeof _v138["content"] !== "string") {
            ctx.errors.push({ path: path + "/" + _v137 + "/content", message: "expected string" + ", got " + JSON.stringify(_v138["content"]) });
          }
        }
        for (const _v139 of Object.keys(_v138)) {
          if (_v139 !== "content" && _v139 !== "fontFamily" && _v139 !== "fontSize" && _v139 !== "fontWeight" && _v139 !== "letterSpacing" && _v139 !== "fontStyle" && _v139 !== "underline" && _v139 !== "lineHeight" && _v139 !== "textAlign" && _v139 !== "textAlignVertical" && _v139 !== "strikethrough" && _v139 !== "href") {
            ctx.errors.push({ path: path + "/" + _v137 + "/" + _v139, message: "unexpected property" + ", got " + JSON.stringify(_v139) });
          }
        }
      }
    }
  } else {
    const _v140: ValidationContext = { errors: [], partial: ctx.partial };
    let _v141 = false;
    if (!_v141) {
      const _v142: ValidationContext = { errors: [], partial: _v140.partial };
      validate_stringOrVariable(v, _v142, path);
      if (_v142.errors.length === 0) _v141 = true;
    }
    if (!_v141) {
      _v140.errors.push({ path: path, message: "expected either string or \"$variable\"" + ", got " + JSON.stringify(v) });
    }
    if (_v140.errors.length > 0) {
      ctx.errors.push({ path: path, message: "expected one of: string, \"$variable\", textStyle[]" + ", got " + JSON.stringify(v) });
    }
  }
}

export function validate_text(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveGraphics(v, ctx, path);
  validate_textStyle(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v143 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v143)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v143["type"] !== undefined) {
      if (_v143["type"] !== "text") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"text\"" + ", got " + JSON.stringify(_v143["type"]) });
      }
    }
    if (_v143["content"] !== undefined) {
      validate_textContent(_v143["content"], ctx, path + "/content");
    }
    if (_v143["textGrowth"] !== undefined) {
      const _v144: ValidationContext = { errors: [], partial: ctx.partial };
      if (_v143["textGrowth"] !== "auto" && _v143["textGrowth"] !== "fixed-width" && _v143["textGrowth"] !== "fixed-width-height") {
        _v144.errors.push({ path: path + "/textGrowth", message: "expected one of: \"auto\", \"fixed-width\", \"fixed-width-height\"" + ", got " + JSON.stringify(_v143["textGrowth"]) });
      }
      if (_v144.errors.length > 0 && ctx.transform) {
        const _v145 = ctx.transform("textGrowth", _v143["textGrowth"]);
        if (_v145 !== undefined) _v143["textGrowth"] = _v145;
        if (_v143["textGrowth"] !== "auto" && _v143["textGrowth"] !== "fixed-width" && _v143["textGrowth"] !== "fixed-width-height") {
          ctx.errors.push({ path: path + "/textGrowth", message: "expected one of: \"auto\", \"fixed-width\", \"fixed-width-height\"" + ", got " + JSON.stringify(_v143["textGrowth"]) });
        }
      } else {
        for (const _e of _v144.errors) ctx.errors.push(_e);
      }
    }
    for (const _v146 of Object.keys(_v143)) {
      if (_v146 !== "type" && _v146 !== "content" && _v146 !== "textGrowth" && _v146 !== "x" && _v146 !== "y" && _v146 !== "id" && _v146 !== "name" && _v146 !== "context" && _v146 !== "reusable" && _v146 !== "theme" && _v146 !== "enabled" && _v146 !== "opacity" && _v146 !== "flipX" && _v146 !== "flipY" && _v146 !== "layoutPosition" && _v146 !== "metadata" && _v146 !== "rotation" && _v146 !== "width" && _v146 !== "height" && _v146 !== "effect" && _v146 !== "stroke" && _v146 !== "fill" && _v146 !== "fontFamily" && _v146 !== "fontSize" && _v146 !== "fontWeight" && _v146 !== "letterSpacing" && _v146 !== "fontStyle" && _v146 !== "underline" && _v146 !== "lineHeight" && _v146 !== "textAlign" && _v146 !== "textAlignVertical" && _v146 !== "strikethrough" && _v146 !== "href") {
        ctx.errors.push({ path: path + "/" + _v146, message: "unexpected property" + ", got " + JSON.stringify(_v146) });
      }
    }
  }
}

export function validate_note(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_textStyle(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v147 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v147)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v147["type"] !== undefined) {
      if (_v147["type"] !== "note") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"note\"" + ", got " + JSON.stringify(_v147["type"]) });
      }
    }
    if (_v147["content"] !== undefined) {
      validate_textContent(_v147["content"], ctx, path + "/content");
    }
    for (const _v148 of Object.keys(_v147)) {
      if (_v148 !== "type" && _v148 !== "content" && _v148 !== "x" && _v148 !== "y" && _v148 !== "id" && _v148 !== "name" && _v148 !== "context" && _v148 !== "reusable" && _v148 !== "theme" && _v148 !== "enabled" && _v148 !== "opacity" && _v148 !== "flipX" && _v148 !== "flipY" && _v148 !== "layoutPosition" && _v148 !== "metadata" && _v148 !== "rotation" && _v148 !== "width" && _v148 !== "height" && _v148 !== "fontFamily" && _v148 !== "fontSize" && _v148 !== "fontWeight" && _v148 !== "letterSpacing" && _v148 !== "fontStyle" && _v148 !== "underline" && _v148 !== "lineHeight" && _v148 !== "textAlign" && _v148 !== "textAlignVertical" && _v148 !== "strikethrough" && _v148 !== "href") {
        ctx.errors.push({ path: path + "/" + _v148, message: "unexpected property" + ", got " + JSON.stringify(_v148) });
      }
    }
  }
}

export function validate_prompt(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_textStyle(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v149 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v149)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v149["type"] !== undefined) {
      if (_v149["type"] !== "prompt") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"prompt\"" + ", got " + JSON.stringify(_v149["type"]) });
      }
    }
    if (_v149["content"] !== undefined) {
      validate_textContent(_v149["content"], ctx, path + "/content");
    }
    if (_v149["model"] !== undefined) {
      validate_stringOrVariable(_v149["model"], ctx, path + "/model");
    }
    for (const _v150 of Object.keys(_v149)) {
      if (_v150 !== "type" && _v150 !== "content" && _v150 !== "model" && _v150 !== "x" && _v150 !== "y" && _v150 !== "id" && _v150 !== "name" && _v150 !== "context" && _v150 !== "reusable" && _v150 !== "theme" && _v150 !== "enabled" && _v150 !== "opacity" && _v150 !== "flipX" && _v150 !== "flipY" && _v150 !== "layoutPosition" && _v150 !== "metadata" && _v150 !== "rotation" && _v150 !== "width" && _v150 !== "height" && _v150 !== "fontFamily" && _v150 !== "fontSize" && _v150 !== "fontWeight" && _v150 !== "letterSpacing" && _v150 !== "fontStyle" && _v150 !== "underline" && _v150 !== "lineHeight" && _v150 !== "textAlign" && _v150 !== "textAlignVertical" && _v150 !== "strikethrough" && _v150 !== "href") {
        ctx.errors.push({ path: path + "/" + _v150, message: "unexpected property" + ", got " + JSON.stringify(_v150) });
      }
    }
  }
}

export function validate_context(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_textStyle(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v151 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v151)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v151["type"] !== undefined) {
      if (_v151["type"] !== "context") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"context\"" + ", got " + JSON.stringify(_v151["type"]) });
      }
    }
    if (_v151["content"] !== undefined) {
      validate_textContent(_v151["content"], ctx, path + "/content");
    }
    for (const _v152 of Object.keys(_v151)) {
      if (_v152 !== "type" && _v152 !== "content" && _v152 !== "x" && _v152 !== "y" && _v152 !== "id" && _v152 !== "name" && _v152 !== "context" && _v152 !== "reusable" && _v152 !== "theme" && _v152 !== "enabled" && _v152 !== "opacity" && _v152 !== "flipX" && _v152 !== "flipY" && _v152 !== "layoutPosition" && _v152 !== "metadata" && _v152 !== "rotation" && _v152 !== "width" && _v152 !== "height" && _v152 !== "fontFamily" && _v152 !== "fontSize" && _v152 !== "fontWeight" && _v152 !== "letterSpacing" && _v152 !== "fontStyle" && _v152 !== "underline" && _v152 !== "lineHeight" && _v152 !== "textAlign" && _v152 !== "textAlignVertical" && _v152 !== "strikethrough" && _v152 !== "href") {
        ctx.errors.push({ path: path + "/" + _v152, message: "unexpected property" + ", got " + JSON.stringify(_v152) });
      }
    }
  }
}

export function validate_iconFont(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  validate_size(v, ctx, path);
  validate_canHaveEffects(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v153 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v153)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v153["type"] !== undefined) {
      if (_v153["type"] !== "icon_font") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"icon_font\"" + ", got " + JSON.stringify(_v153["type"]) });
      }
    }
    if (_v153["iconFontName"] !== undefined) {
      validate_stringOrVariable(_v153["iconFontName"], ctx, path + "/iconFontName");
    }
    if (_v153["iconFontFamily"] !== undefined) {
      validate_stringOrVariable(_v153["iconFontFamily"], ctx, path + "/iconFontFamily");
    }
    if (_v153["weight"] !== undefined) {
      validate_numberOrVariable(_v153["weight"], ctx, path + "/weight");
    }
    if (_v153["fill"] !== undefined) {
      const _v154: ValidationContext = { errors: [], partial: ctx.partial };
      validate_fills(_v153["fill"], _v154, path + "/fill");
      if (_v154.errors.length > 0 && ctx.transform) {
        const _v155 = ctx.transform("color", _v153["fill"]);
        if (_v155 !== undefined) _v153["fill"] = _v155;
        validate_fills(_v153["fill"], ctx, path + "/fill");
      } else {
        for (const _e of _v154.errors) ctx.errors.push(_e);
      }
    }
    for (const _v156 of Object.keys(_v153)) {
      if (_v156 !== "type" && _v156 !== "iconFontName" && _v156 !== "iconFontFamily" && _v156 !== "weight" && _v156 !== "fill" && _v156 !== "x" && _v156 !== "y" && _v156 !== "id" && _v156 !== "name" && _v156 !== "context" && _v156 !== "reusable" && _v156 !== "theme" && _v156 !== "enabled" && _v156 !== "opacity" && _v156 !== "flipX" && _v156 !== "flipY" && _v156 !== "layoutPosition" && _v156 !== "metadata" && _v156 !== "rotation" && _v156 !== "width" && _v156 !== "height" && _v156 !== "effect") {
        ctx.errors.push({ path: path + "/" + _v156, message: "unexpected property" + ", got " + JSON.stringify(_v156) });
      }
    }
  }
}

export function validate_idPath(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "string") {
    ctx.errors.push({ path: path, message: "expected slash-separated path of IDs" + ", got " + JSON.stringify(v) });
  } else if (!_re4.test(v)) {
    ctx.errors.push({ path: path, message: "expected slash-separated path of IDs" + ", got " + JSON.stringify(v) });
  }
}

export function validate_ref(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v157 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v157)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v157["type"] !== undefined) {
      if (_v157["type"] !== "ref") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"ref\"" + ", got " + JSON.stringify(_v157["type"]) });
      }
    }
    if (!ctx.partial && !("ref" in _v157)) {
      ctx.errors.push({ path: path + "/ref", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v157["ref"] !== undefined) {
      if (typeof _v157["ref"] !== "string") {
        ctx.errors.push({ path: path + "/ref", message: "expected string without slashes" + ", got " + JSON.stringify(_v157["ref"]) });
      } else if (!_re2.test(_v157["ref"])) {
        ctx.errors.push({ path: path + "/ref", message: "expected string without slashes" + ", got " + JSON.stringify(_v157["ref"]) });
      }
    }
    if (_v157["descendants"] !== undefined) {
      if (typeof _v157["descendants"] !== "object" || _v157["descendants"] === null) {
        ctx.errors.push({ path: path + "/descendants", message: "expected object" + ", got " + JSON.stringify(_v157["descendants"]) });
      } else {
        const _v158 = _v157["descendants"] as Record<string, unknown>;
        for (const _v159 of Object.keys(_v158)) {
          validate_idPath(_v159, ctx, path + "/descendants" + "/" + _v159);
          if (typeof _v158[_v159] !== "object" || _v158[_v159] === null) {
            ctx.errors.push({ path: path + "/descendants" + "/" + _v159, message: "expected object" + ", got " + JSON.stringify(_v158[_v159]) });
          } else {
            const _v160 = _v158[_v159] as Record<string, unknown>;
          }
        }
      }
    }
  }
}

export function validate_child(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected one of: \"frame\", \"group\", \"rectangle\", \"ellipse\", \"line\", \"path\", \"polygon\", \"text\", \"note\", \"prompt\", \"context\", \"icon_font\", \"ref\"" + ", got " + JSON.stringify(v) });
  } else {
    const _v161 = v as Record<string, unknown>;
    switch (_v161["type"]) {
      case "frame":
        validate_frame(v, ctx, path);
        break;
      case "group":
        validate_group(v, ctx, path);
        break;
      case "rectangle":
        validate_rectangle(v, ctx, path);
        break;
      case "ellipse":
        validate_ellipse(v, ctx, path);
        break;
      case "line":
        validate_line(v, ctx, path);
        break;
      case "path":
        validate_path(v, ctx, path);
        break;
      case "polygon":
        validate_polygon(v, ctx, path);
        break;
      case "text":
        validate_text(v, ctx, path);
        break;
      case "note":
        validate_note(v, ctx, path);
        break;
      case "prompt":
        validate_prompt(v, ctx, path);
        break;
      case "context":
        validate_context(v, ctx, path);
        break;
      case "icon_font":
        validate_iconFont(v, ctx, path);
        break;
      case "ref":
        validate_ref(v, ctx, path);
        break;
      default:
        ctx.errors.push({ path: path + "/type", message: "expected one of: \"frame\", \"group\", \"rectangle\", \"ellipse\", \"line\", \"path\", \"polygon\", \"text\", \"note\", \"prompt\", \"context\", \"icon_font\", \"ref\"" + ", got " + JSON.stringify(_v161["type"]) });
    }
  }
}

export function validate_canHaveChildren(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v162 = v as Record<string, unknown>;
    if (_v162["children"] !== undefined) {
      if (!Array.isArray(_v162["children"])) {
        ctx.errors.push({ path: path + "/children", message: "expected array" + ", got " + JSON.stringify(_v162["children"]) });
      } else {
        for (let _v163 = 0; _v163 < _v162["children"].length; _v163++) {
          validate_child(_v162["children"][_v163], ctx, path + "/children" + "/" + _v163);
        }
      }
    }
  }
}

export function validate_frame(v: unknown, ctx: ValidationContext, path: string): void {
  validate_rectangleish(v, ctx, path);
  validate_canHaveChildren(v, ctx, path);
  validate_layout(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v164 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v164)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v164["type"] !== undefined) {
      if (_v164["type"] !== "frame") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"frame\"" + ", got " + JSON.stringify(_v164["type"]) });
      }
    }
    if (_v164["clip"] !== undefined) {
      validate_booleanOrVariable(_v164["clip"], ctx, path + "/clip");
    }
    if (_v164["placeholder"] !== undefined) {
      if (typeof _v164["placeholder"] !== "boolean") {
        ctx.errors.push({ path: path + "/placeholder", message: "expected boolean" + ", got " + JSON.stringify(_v164["placeholder"]) });
      }
    }
    if (_v164["slot"] !== undefined) {
      if (typeof _v164["slot"] === "boolean") {
        const _v165: ValidationContext = { errors: [], partial: ctx.partial };
        let _v166 = false;
        if (!_v166) {
          const _v167: ValidationContext = { errors: [], partial: _v165.partial };
          if (_v164["slot"] !== false) {
            _v167.errors.push({ path: path + "/slot", message: "expected " + "false" + ", got " + JSON.stringify(_v164["slot"]) });
          }
          if (_v167.errors.length === 0) _v166 = true;
        }
        if (!_v166) {
          _v165.errors.push({ path: path + "/slot", message: "expected one of: false" + ", got " + JSON.stringify(_v164["slot"]) });
        }
        if (_v165.errors.length > 0) {
          ctx.errors.push({ path: path + "/slot", message: "expected either false or string[]" + ", got " + JSON.stringify(_v164["slot"]) });
        }
      } else if (Array.isArray(_v164["slot"])) {
        for (let _v168 = 0; _v168 < _v164["slot"].length; _v168++) {
          if (typeof _v164["slot"][_v168] !== "string") {
            ctx.errors.push({ path: path + "/slot" + "/" + _v168, message: "expected string" + ", got " + JSON.stringify(_v164["slot"][_v168]) });
          }
        }
      } else {
        ctx.errors.push({ path: path + "/slot", message: "expected either false or string[]" + ", got " + JSON.stringify(_v164["slot"]) });
      }
    }
    for (const _v169 of Object.keys(_v164)) {
      if (_v169 !== "type" && _v169 !== "clip" && _v169 !== "placeholder" && _v169 !== "slot" && _v169 !== "x" && _v169 !== "y" && _v169 !== "id" && _v169 !== "name" && _v169 !== "context" && _v169 !== "reusable" && _v169 !== "theme" && _v169 !== "enabled" && _v169 !== "opacity" && _v169 !== "flipX" && _v169 !== "flipY" && _v169 !== "layoutPosition" && _v169 !== "metadata" && _v169 !== "rotation" && _v169 !== "width" && _v169 !== "height" && _v169 !== "effect" && _v169 !== "stroke" && _v169 !== "fill" && _v169 !== "cornerRadius" && _v169 !== "children" && _v169 !== "layout" && _v169 !== "gap" && _v169 !== "layoutIncludeStroke" && _v169 !== "padding" && _v169 !== "justifyContent" && _v169 !== "alignItems") {
        ctx.errors.push({ path: path + "/" + _v169, message: "unexpected property" + ", got " + JSON.stringify(_v169) });
      }
    }
  }
}

export function validate_connectionAnchor(v: unknown, ctx: ValidationContext, path: string): void {
  if (v !== "center" && v !== "top" && v !== "left" && v !== "bottom" && v !== "right") {
    ctx.errors.push({ path: path, message: "expected one of: \"center\", \"top\", \"left\", \"bottom\", \"right\"" + ", got " + JSON.stringify(v) });
  }
}

export function validate_connectionEndpoint(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v170 = v as Record<string, unknown>;
    if (!ctx.partial && !("path" in _v170)) {
      ctx.errors.push({ path: path + "/path", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v170["path"] !== undefined) {
      validate_idPath(_v170["path"], ctx, path + "/path");
    }
    if (!ctx.partial && !("anchor" in _v170)) {
      ctx.errors.push({ path: path + "/anchor", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v170["anchor"] !== undefined) {
      validate_connectionAnchor(_v170["anchor"], ctx, path + "/anchor");
    }
    for (const _v171 of Object.keys(_v170)) {
      if (_v171 !== "path" && _v171 !== "anchor") {
        ctx.errors.push({ path: path + "/" + _v171, message: "unexpected property" + ", got " + JSON.stringify(_v171) });
      }
    }
  }
}

export function validate_connection(v: unknown, ctx: ValidationContext, path: string): void {
  validate_entity(v, ctx, path);
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v172 = v as Record<string, unknown>;
    if (!ctx.partial && !("type" in _v172)) {
      ctx.errors.push({ path: path + "/type", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v172["type"] !== undefined) {
      if (_v172["type"] !== "connection") {
        ctx.errors.push({ path: path + "/type", message: "expected " + "\"connection\"" + ", got " + JSON.stringify(_v172["type"]) });
      }
    }
    if (!ctx.partial && !("source" in _v172)) {
      ctx.errors.push({ path: path + "/source", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v172["source"] !== undefined) {
      validate_connectionEndpoint(_v172["source"], ctx, path + "/source");
    }
    if (!ctx.partial && !("target" in _v172)) {
      ctx.errors.push({ path: path + "/target", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v172["target"] !== undefined) {
      validate_connectionEndpoint(_v172["target"], ctx, path + "/target");
    }
    if (_v172["stroke"] !== undefined) {
      validate_stroke(_v172["stroke"], ctx, path + "/stroke");
    }
    for (const _v173 of Object.keys(_v172)) {
      if (_v173 !== "type" && _v173 !== "source" && _v173 !== "target" && _v173 !== "stroke" && _v173 !== "x" && _v173 !== "y" && _v173 !== "id" && _v173 !== "name" && _v173 !== "context" && _v173 !== "reusable" && _v173 !== "theme" && _v173 !== "enabled" && _v173 !== "opacity" && _v173 !== "flipX" && _v173 !== "flipY" && _v173 !== "layoutPosition" && _v173 !== "metadata" && _v173 !== "rotation") {
        ctx.errors.push({ path: path + "/" + _v173, message: "unexpected property" + ", got " + JSON.stringify(_v173) });
      }
    }
  }
}

export function validate_document(v: unknown, ctx: ValidationContext, path: string): void {
  if (typeof v !== "object" || v === null) {
    ctx.errors.push({ path: path, message: "expected object" + ", got " + JSON.stringify(v) });
  } else {
    const _v174 = v as Record<string, unknown>;
    if (!ctx.partial && !("version" in _v174)) {
      ctx.errors.push({ path: path + "/version", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v174["version"] !== undefined) {
      if (_v174["version"] !== "2.10") {
        ctx.errors.push({ path: path + "/version", message: "expected " + "\"2.10\"" + ", got " + JSON.stringify(_v174["version"]) });
      }
    }
    if (_v174["fonts"] !== undefined) {
      if (!Array.isArray(_v174["fonts"])) {
        ctx.errors.push({ path: path + "/fonts", message: "expected array" + ", got " + JSON.stringify(_v174["fonts"]) });
      } else {
        for (let _v175 = 0; _v175 < _v174["fonts"].length; _v175++) {
          if (typeof _v174["fonts"][_v175] !== "object" || _v174["fonts"][_v175] === null) {
            ctx.errors.push({ path: path + "/fonts" + "/" + _v175, message: "expected object" + ", got " + JSON.stringify(_v174["fonts"][_v175]) });
          } else {
            const _v176 = _v174["fonts"][_v175] as Record<string, unknown>;
            if (_v176["name"] !== undefined) {
              if (typeof _v176["name"] !== "string") {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/name", message: "expected string" + ", got " + JSON.stringify(_v176["name"]) });
              }
            }
            if (_v176["url"] !== undefined) {
              if (typeof _v176["url"] !== "string") {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/url", message: "expected string" + ", got " + JSON.stringify(_v176["url"]) });
              }
            }
            if (_v176["style"] !== undefined) {
              if (_v176["style"] !== "normal" && _v176["style"] !== "italic") {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/style", message: "expected one of: \"normal\", \"italic\"" + ", got " + JSON.stringify(_v176["style"]) });
              }
            }
            if (_v176["weight"] !== undefined) {
              if (Array.isArray(_v176["weight"])) {
                if (_v176["weight"].length !== 2) {
                  ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/weight", message: "expected either number or number[2]" + ", got " + JSON.stringify(_v176["weight"]) });
                } else {
                  for (let _v177 = 0; _v177 < _v176["weight"].length; _v177++) {
                    if (typeof _v176["weight"][_v177] !== "number") {
                      ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/weight" + "/" + _v177, message: "expected number" + ", got " + JSON.stringify(_v176["weight"][_v177]) });
                    }
                  }
                }
              } else if (!(typeof _v176["weight"] === "number")) {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/weight", message: "expected either number or number[2]" + ", got " + JSON.stringify(_v176["weight"]) });
              }
            }
            if (_v176["axes"] !== undefined) {
              if (!Array.isArray(_v176["axes"])) {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes", message: "expected array" + ", got " + JSON.stringify(_v176["axes"]) });
              } else {
                for (let _v178 = 0; _v178 < _v176["axes"].length; _v178++) {
                  if (typeof _v176["axes"][_v178] !== "object" || _v176["axes"][_v178] === null) {
                    ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes" + "/" + _v178, message: "expected object" + ", got " + JSON.stringify(_v176["axes"][_v178]) });
                  } else {
                    const _v179 = _v176["axes"][_v178] as Record<string, unknown>;
                    if (_v179["tag"] !== undefined) {
                      if (typeof _v179["tag"] !== "string") {
                        ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes" + "/" + _v178 + "/tag", message: "expected string" + ", got " + JSON.stringify(_v179["tag"]) });
                      }
                    }
                    if (_v179["start"] !== undefined) {
                      if (typeof _v179["start"] !== "number") {
                        ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes" + "/" + _v178 + "/start", message: "expected number" + ", got " + JSON.stringify(_v179["start"]) });
                      }
                    }
                    if (_v179["end"] !== undefined) {
                      if (typeof _v179["end"] !== "number") {
                        ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes" + "/" + _v178 + "/end", message: "expected number" + ", got " + JSON.stringify(_v179["end"]) });
                      }
                    }
                    for (const _v180 of Object.keys(_v179)) {
                      if (_v180 !== "tag" && _v180 !== "start" && _v180 !== "end") {
                        ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/axes" + "/" + _v178 + "/" + _v180, message: "unexpected property" + ", got " + JSON.stringify(_v180) });
                      }
                    }
                  }
                }
              }
            }
            for (const _v181 of Object.keys(_v176)) {
              if (_v181 !== "name" && _v181 !== "url" && _v181 !== "style" && _v181 !== "weight" && _v181 !== "axes") {
                ctx.errors.push({ path: path + "/fonts" + "/" + _v175 + "/" + _v181, message: "unexpected property" + ", got " + JSON.stringify(_v181) });
              }
            }
          }
        }
      }
    }
    if (_v174["themes"] !== undefined) {
      if (typeof _v174["themes"] !== "object" || _v174["themes"] === null) {
        ctx.errors.push({ path: path + "/themes", message: "expected object" + ", got " + JSON.stringify(_v174["themes"]) });
      } else {
        const _v182 = _v174["themes"] as Record<string, unknown>;
        for (const _v183 of Object.keys(_v182)) {
          if (_re5.test(_v183)) {
            if (!Array.isArray(_v182[_v183])) {
              ctx.errors.push({ path: path + "/themes" + "/" + _v183, message: "expected array" + ", got " + JSON.stringify(_v182[_v183]) });
            } else {
              if (_v182[_v183].length < 1) {
                ctx.errors.push({ path: path + "/themes" + "/" + _v183, message: "expected at least 1 items" + ", got " + JSON.stringify(_v182[_v183].length) });
              }
              for (let _v184 = 0; _v184 < _v182[_v183].length; _v184++) {
                if (typeof _v182[_v183][_v184] !== "string") {
                  ctx.errors.push({ path: path + "/themes" + "/" + _v183 + "/" + _v184, message: "expected string" + ", got " + JSON.stringify(_v182[_v183][_v184]) });
                }
              }
            }
          }
        }
      }
    }
    if (_v174["imports"] !== undefined) {
      if (typeof _v174["imports"] !== "object" || _v174["imports"] === null) {
        ctx.errors.push({ path: path + "/imports", message: "expected object" + ", got " + JSON.stringify(_v174["imports"]) });
      } else {
        const _v185 = _v174["imports"] as Record<string, unknown>;
        for (const _v186 of Object.keys(_v185)) {
          if (typeof _v185[_v186] !== "string") {
            ctx.errors.push({ path: path + "/imports" + "/" + _v186, message: "expected string" + ", got " + JSON.stringify(_v185[_v186]) });
          }
        }
      }
    }
    if (_v174["variables"] !== undefined) {
      if (typeof _v174["variables"] !== "object" || _v174["variables"] === null) {
        ctx.errors.push({ path: path + "/variables", message: "expected object" + ", got " + JSON.stringify(_v174["variables"]) });
      } else {
        const _v187 = _v174["variables"] as Record<string, unknown>;
        for (const _v188 of Object.keys(_v187)) {
          if (_re5.test(_v188)) {
            if (typeof _v187[_v188] !== "object" || _v187[_v188] === null) {
              ctx.errors.push({ path: path + "/variables" + "/" + _v188, message: "expected one of: \"boolean\", \"color\", \"number\", \"string\"" + ", got " + JSON.stringify(_v187[_v188]) });
            } else {
              const _v189 = _v187[_v188] as Record<string, unknown>;
              switch (_v189["type"]) {
                case "boolean":
                  if (typeof _v187[_v188] !== "object" || _v187[_v188] === null) {
                    ctx.errors.push({ path: path + "/variables" + "/" + _v188, message: "expected object" + ", got " + JSON.stringify(_v187[_v188]) });
                  } else {
                    const _v190 = _v187[_v188] as Record<string, unknown>;
                    if (!ctx.partial && !("type" in _v190)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v190["type"] !== undefined) {
                      if (_v190["type"] !== "boolean") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "expected " + "\"boolean\"" + ", got " + JSON.stringify(_v190["type"]) });
                      }
                    }
                    if (!ctx.partial && !("value" in _v190)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v190["value"] !== undefined) {
                      if (Array.isArray(_v190["value"])) {
                        for (let _v191 = 0; _v191 < _v190["value"].length; _v191++) {
                          if (typeof _v190["value"][_v191] !== "object" || _v190["value"][_v191] === null) {
                            ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v191, message: "expected object" + ", got " + JSON.stringify(_v190["value"][_v191]) });
                          } else {
                            const _v192 = _v190["value"][_v191] as Record<string, unknown>;
                            if (!ctx.partial && !("value" in _v192)) {
                              ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v191 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v190["value"][_v191]) });
                            } else if (_v192["value"] !== undefined) {
                              validate_booleanOrVariable(_v192["value"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v191 + "/value");
                            }
                            if (_v192["theme"] !== undefined) {
                              validate_theme(_v192["theme"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v191 + "/theme");
                            }
                            for (const _v193 of Object.keys(_v192)) {
                              if (_v193 !== "value" && _v193 !== "theme") {
                                ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v191 + "/" + _v193, message: "unexpected property" + ", got " + JSON.stringify(_v193) });
                              }
                            }
                          }
                        }
                      } else {
                        const _v194: ValidationContext = { errors: [], partial: ctx.partial };
                        let _v195 = false;
                        if (!_v195) {
                          const _v196: ValidationContext = { errors: [], partial: _v194.partial };
                          validate_booleanOrVariable(_v190["value"], _v196, path + "/variables" + "/" + _v188 + "/value");
                          if (_v196.errors.length === 0) _v195 = true;
                        }
                        if (!_v195) {
                          _v194.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected either boolean or \"$variable\"" + ", got " + JSON.stringify(_v190["value"]) });
                        }
                        if (_v194.errors.length > 0) {
                          ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected one of: boolean, \"$variable\", object[]" + ", got " + JSON.stringify(_v190["value"]) });
                        }
                      }
                    }
                    for (const _v197 of Object.keys(_v190)) {
                      if (_v197 !== "type" && _v197 !== "value") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/" + _v197, message: "unexpected property" + ", got " + JSON.stringify(_v197) });
                      }
                    }
                  }
                  break;
                case "color":
                  if (typeof _v187[_v188] !== "object" || _v187[_v188] === null) {
                    ctx.errors.push({ path: path + "/variables" + "/" + _v188, message: "expected object" + ", got " + JSON.stringify(_v187[_v188]) });
                  } else {
                    const _v198 = _v187[_v188] as Record<string, unknown>;
                    if (!ctx.partial && !("type" in _v198)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v198["type"] !== undefined) {
                      if (_v198["type"] !== "color") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "expected " + "\"color\"" + ", got " + JSON.stringify(_v198["type"]) });
                      }
                    }
                    if (!ctx.partial && !("value" in _v198)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v198["value"] !== undefined) {
                      const _v199: ValidationContext = { errors: [], partial: ctx.partial };
                      if (Array.isArray(_v198["value"])) {
                        for (let _v200 = 0; _v200 < _v198["value"].length; _v200++) {
                          if (typeof _v198["value"][_v200] !== "object" || _v198["value"][_v200] === null) {
                            _v199.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v200, message: "expected object" + ", got " + JSON.stringify(_v198["value"][_v200]) });
                          } else {
                            const _v201 = _v198["value"][_v200] as Record<string, unknown>;
                            if (!_v199.partial && !("value" in _v201)) {
                              _v199.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v200 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v198["value"][_v200]) });
                            } else if (_v201["value"] !== undefined) {
                              const _v202: ValidationContext = { errors: [], partial: _v199.partial };
                              validate_colorOrVariable(_v201["value"], _v202, path + "/variables" + "/" + _v188 + "/value" + "/" + _v200 + "/value");
                              if (_v202.errors.length > 0 && _v199.transform) {
                                const _v203 = _v199.transform("color", _v201["value"]);
                                if (_v203 !== undefined) _v201["value"] = _v203;
                                validate_colorOrVariable(_v201["value"], _v199, path + "/variables" + "/" + _v188 + "/value" + "/" + _v200 + "/value");
                              } else {
                                for (const _e of _v202.errors) _v199.errors.push(_e);
                              }
                            }
                            if (_v201["theme"] !== undefined) {
                              validate_theme(_v201["theme"], _v199, path + "/variables" + "/" + _v188 + "/value" + "/" + _v200 + "/theme");
                            }
                            for (const _v204 of Object.keys(_v201)) {
                              if (_v204 !== "value" && _v204 !== "theme") {
                                _v199.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v200 + "/" + _v204, message: "unexpected property" + ", got " + JSON.stringify(_v204) });
                              }
                            }
                          }
                        }
                      } else {
                        const _v205: ValidationContext = { errors: [], partial: _v199.partial };
                        let _v206 = false;
                        if (!_v206) {
                          const _v207: ValidationContext = { errors: [], partial: _v205.partial };
                          validate_colorOrVariable(_v198["value"], _v207, path + "/variables" + "/" + _v188 + "/value");
                          if (_v207.errors.length === 0) _v206 = true;
                        }
                        if (!_v206) {
                          _v205.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or \"$variable\"" + ", got " + JSON.stringify(_v198["value"]) });
                        }
                        if (_v205.errors.length > 0) {
                          _v199.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), \"$variable\", object[]" + ", got " + JSON.stringify(_v198["value"]) });
                        }
                      }
                      if (_v199.errors.length > 0 && ctx.transform) {
                        const _v208 = ctx.transform("color", _v198["value"]);
                        if (_v208 !== undefined) _v198["value"] = _v208;
                        if (Array.isArray(_v198["value"])) {
                          for (let _v209 = 0; _v209 < _v198["value"].length; _v209++) {
                            if (typeof _v198["value"][_v209] !== "object" || _v198["value"][_v209] === null) {
                              ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v209, message: "expected object" + ", got " + JSON.stringify(_v198["value"][_v209]) });
                            } else {
                              const _v210 = _v198["value"][_v209] as Record<string, unknown>;
                              if (!ctx.partial && !("value" in _v210)) {
                                ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v209 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v198["value"][_v209]) });
                              } else if (_v210["value"] !== undefined) {
                                const _v211: ValidationContext = { errors: [], partial: ctx.partial };
                                validate_colorOrVariable(_v210["value"], _v211, path + "/variables" + "/" + _v188 + "/value" + "/" + _v209 + "/value");
                                if (_v211.errors.length > 0 && ctx.transform) {
                                  const _v212 = ctx.transform("color", _v210["value"]);
                                  if (_v212 !== undefined) _v210["value"] = _v212;
                                  validate_colorOrVariable(_v210["value"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v209 + "/value");
                                } else {
                                  for (const _e of _v211.errors) ctx.errors.push(_e);
                                }
                              }
                              if (_v210["theme"] !== undefined) {
                                validate_theme(_v210["theme"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v209 + "/theme");
                              }
                              for (const _v213 of Object.keys(_v210)) {
                                if (_v213 !== "value" && _v213 !== "theme") {
                                  ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v209 + "/" + _v213, message: "unexpected property" + ", got " + JSON.stringify(_v213) });
                                }
                              }
                            }
                          }
                        } else {
                          const _v214: ValidationContext = { errors: [], partial: ctx.partial };
                          let _v215 = false;
                          if (!_v215) {
                            const _v216: ValidationContext = { errors: [], partial: _v214.partial };
                            validate_colorOrVariable(_v198["value"], _v216, path + "/variables" + "/" + _v188 + "/value");
                            if (_v216.errors.length === 0) _v215 = true;
                          }
                          if (!_v215) {
                            _v214.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or \"$variable\"" + ", got " + JSON.stringify(_v198["value"]) });
                          }
                          if (_v214.errors.length > 0) {
                            ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), \"$variable\", object[]" + ", got " + JSON.stringify(_v198["value"]) });
                          }
                        }
                      } else {
                        for (const _e of _v199.errors) ctx.errors.push(_e);
                      }
                    }
                    for (const _v217 of Object.keys(_v198)) {
                      if (_v217 !== "type" && _v217 !== "value") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/" + _v217, message: "unexpected property" + ", got " + JSON.stringify(_v217) });
                      }
                    }
                  }
                  break;
                case "number":
                  if (typeof _v187[_v188] !== "object" || _v187[_v188] === null) {
                    ctx.errors.push({ path: path + "/variables" + "/" + _v188, message: "expected object" + ", got " + JSON.stringify(_v187[_v188]) });
                  } else {
                    const _v218 = _v187[_v188] as Record<string, unknown>;
                    if (!ctx.partial && !("type" in _v218)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v218["type"] !== undefined) {
                      if (_v218["type"] !== "number") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "expected " + "\"number\"" + ", got " + JSON.stringify(_v218["type"]) });
                      }
                    }
                    if (!ctx.partial && !("value" in _v218)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v218["value"] !== undefined) {
                      if (Array.isArray(_v218["value"])) {
                        for (let _v219 = 0; _v219 < _v218["value"].length; _v219++) {
                          if (typeof _v218["value"][_v219] !== "object" || _v218["value"][_v219] === null) {
                            ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v219, message: "expected object" + ", got " + JSON.stringify(_v218["value"][_v219]) });
                          } else {
                            const _v220 = _v218["value"][_v219] as Record<string, unknown>;
                            if (!ctx.partial && !("value" in _v220)) {
                              ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v219 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v218["value"][_v219]) });
                            } else if (_v220["value"] !== undefined) {
                              validate_numberOrVariable(_v220["value"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v219 + "/value");
                            }
                            if (_v220["theme"] !== undefined) {
                              validate_theme(_v220["theme"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v219 + "/theme");
                            }
                            for (const _v221 of Object.keys(_v220)) {
                              if (_v221 !== "value" && _v221 !== "theme") {
                                ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v219 + "/" + _v221, message: "unexpected property" + ", got " + JSON.stringify(_v221) });
                              }
                            }
                          }
                        }
                      } else {
                        const _v222: ValidationContext = { errors: [], partial: ctx.partial };
                        let _v223 = false;
                        if (!_v223) {
                          const _v224: ValidationContext = { errors: [], partial: _v222.partial };
                          validate_numberOrVariable(_v218["value"], _v224, path + "/variables" + "/" + _v188 + "/value");
                          if (_v224.errors.length === 0) _v223 = true;
                        }
                        if (!_v223) {
                          _v222.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected either number or \"$variable\"" + ", got " + JSON.stringify(_v218["value"]) });
                        }
                        if (_v222.errors.length > 0) {
                          ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected one of: number, \"$variable\", object[]" + ", got " + JSON.stringify(_v218["value"]) });
                        }
                      }
                    }
                    for (const _v225 of Object.keys(_v218)) {
                      if (_v225 !== "type" && _v225 !== "value") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/" + _v225, message: "unexpected property" + ", got " + JSON.stringify(_v225) });
                      }
                    }
                  }
                  break;
                case "string":
                  if (typeof _v187[_v188] !== "object" || _v187[_v188] === null) {
                    ctx.errors.push({ path: path + "/variables" + "/" + _v188, message: "expected object" + ", got " + JSON.stringify(_v187[_v188]) });
                  } else {
                    const _v226 = _v187[_v188] as Record<string, unknown>;
                    if (!ctx.partial && !("type" in _v226)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v226["type"] !== undefined) {
                      if (_v226["type"] !== "string") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "expected " + "\"string\"" + ", got " + JSON.stringify(_v226["type"]) });
                      }
                    }
                    if (!ctx.partial && !("value" in _v226)) {
                      ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v187[_v188]) });
                    } else if (_v226["value"] !== undefined) {
                      if (Array.isArray(_v226["value"])) {
                        for (let _v227 = 0; _v227 < _v226["value"].length; _v227++) {
                          if (typeof _v226["value"][_v227] !== "object" || _v226["value"][_v227] === null) {
                            ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v227, message: "expected object" + ", got " + JSON.stringify(_v226["value"][_v227]) });
                          } else {
                            const _v228 = _v226["value"][_v227] as Record<string, unknown>;
                            if (!ctx.partial && !("value" in _v228)) {
                              ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v227 + "/value", message: "missing required property" + ", got " + JSON.stringify(_v226["value"][_v227]) });
                            } else if (_v228["value"] !== undefined) {
                              validate_stringOrVariable(_v228["value"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v227 + "/value");
                            }
                            if (_v228["theme"] !== undefined) {
                              validate_theme(_v228["theme"], ctx, path + "/variables" + "/" + _v188 + "/value" + "/" + _v227 + "/theme");
                            }
                            for (const _v229 of Object.keys(_v228)) {
                              if (_v229 !== "value" && _v229 !== "theme") {
                                ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value" + "/" + _v227 + "/" + _v229, message: "unexpected property" + ", got " + JSON.stringify(_v229) });
                              }
                            }
                          }
                        }
                      } else {
                        const _v230: ValidationContext = { errors: [], partial: ctx.partial };
                        let _v231 = false;
                        if (!_v231) {
                          const _v232: ValidationContext = { errors: [], partial: _v230.partial };
                          validate_stringOrVariable(_v226["value"], _v232, path + "/variables" + "/" + _v188 + "/value");
                          if (_v232.errors.length === 0) _v231 = true;
                        }
                        if (!_v231) {
                          _v230.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected either string or \"$variable\"" + ", got " + JSON.stringify(_v226["value"]) });
                        }
                        if (_v230.errors.length > 0) {
                          ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/value", message: "expected one of: string, \"$variable\", object[]" + ", got " + JSON.stringify(_v226["value"]) });
                        }
                      }
                    }
                    for (const _v233 of Object.keys(_v226)) {
                      if (_v233 !== "type" && _v233 !== "value") {
                        ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/" + _v233, message: "unexpected property" + ", got " + JSON.stringify(_v233) });
                      }
                    }
                  }
                  break;
                default:
                  ctx.errors.push({ path: path + "/variables" + "/" + _v188 + "/type", message: "expected one of: \"boolean\", \"color\", \"number\", \"string\"" + ", got " + JSON.stringify(_v189["type"]) });
              }
            }
          }
        }
      }
    }
    if (!ctx.partial && !("children" in _v174)) {
      ctx.errors.push({ path: path + "/children", message: "missing required property" + ", got " + JSON.stringify(v) });
    } else if (_v174["children"] !== undefined) {
      if (!Array.isArray(_v174["children"])) {
        ctx.errors.push({ path: path + "/children", message: "expected array" + ", got " + JSON.stringify(_v174["children"]) });
      } else {
        for (let _v234 = 0; _v234 < _v174["children"].length; _v234++) {
          if (typeof _v174["children"][_v234] !== "object" || _v174["children"][_v234] === null) {
            ctx.errors.push({ path: path + "/children" + "/" + _v234, message: "expected one of: \"frame\", \"group\", \"rectangle\", \"ellipse\", \"line\", \"polygon\", \"path\", \"text\", \"connection\", \"note\", \"context\", \"prompt\", \"icon_font\", \"ref\"" + ", got " + JSON.stringify(_v174["children"][_v234]) });
          } else {
            const _v235 = _v174["children"][_v234] as Record<string, unknown>;
            switch (_v235["type"]) {
              case "frame":
                validate_frame(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "group":
                validate_group(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "rectangle":
                validate_rectangle(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "ellipse":
                validate_ellipse(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "line":
                validate_line(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "polygon":
                validate_polygon(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "path":
                validate_path(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "text":
                validate_text(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "connection":
                validate_connection(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "note":
                validate_note(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "context":
                validate_context(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "prompt":
                validate_prompt(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "icon_font":
                validate_iconFont(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              case "ref":
                validate_ref(_v174["children"][_v234], ctx, path + "/children" + "/" + _v234);
                break;
              default:
                ctx.errors.push({ path: path + "/children" + "/" + _v234 + "/type", message: "expected one of: \"frame\", \"group\", \"rectangle\", \"ellipse\", \"line\", \"polygon\", \"path\", \"text\", \"connection\", \"note\", \"context\", \"prompt\", \"icon_font\", \"ref\"" + ", got " + JSON.stringify(_v235["type"]) });
            }
          }
        }
      }
    }
    for (const _v236 of Object.keys(_v174)) {
      if (_v236 !== "version" && _v236 !== "fonts" && _v236 !== "themes" && _v236 !== "imports" && _v236 !== "variables" && _v236 !== "children") {
        ctx.errors.push({ path: path + "/" + _v236, message: "unexpected property" + ", got " + JSON.stringify(_v236) });
      }
    }
  }
}

const _re0 = new RegExp("^\\$");
const _re1 = new RegExp("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$");
const _re2 = new RegExp("^[^/]+$");
const _re3 = new RegExp("^(fit_content|fill_container)(\\(-?[0-9]+(\\.[0-9]+)?\\))?$");
const _re4 = new RegExp("^[^/]+(/[^/]+)*$");
const _re5 = new RegExp("[^:]+");