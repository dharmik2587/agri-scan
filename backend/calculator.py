"""Pesticide / fertilizer quantity + cost calculator."""

# Base dosage in kg/ha (fertilizer) or L/ha (pesticide) per crop
CROP_BASE_DOSAGE = {
    "Tomato": {"fertilizer": 200, "pesticide": 2.5, "cost_kg": 45, "cost_l": 480, "npk": {"n": 20, "p": 20, "k": 20}},
    "Wheat": {"fertilizer": 150, "pesticide": 2.0, "cost_kg": 30, "cost_l": 420, "npk": {"n": 40, "p": 20, "k": 10}},
    "Rice": {"fertilizer": 180, "pesticide": 2.2, "cost_kg": 32, "cost_l": 450, "npk": {"n": 35, "p": 15, "k": 15}},
    "Paddy": {"fertilizer": 180, "pesticide": 2.2, "cost_kg": 32, "cost_l": 450, "npk": {"n": 35, "p": 15, "k": 15}},
    "Cotton": {"fertilizer": 220, "pesticide": 3.0, "cost_kg": 48, "cost_l": 520, "npk": {"n": 25, "p": 25, "k": 25}},
    "Maize": {"fertilizer": 160, "pesticide": 2.0, "cost_kg": 35, "cost_l": 440, "npk": {"n": 30, "p": 20, "k": 20}},
    "Onion": {"fertilizer": 175, "pesticide": 2.3, "cost_kg": 38, "cost_l": 460, "npk": {"n": 20, "p": 20, "k": 30}},
    "Potato": {"fertilizer": 200, "pesticide": 2.5, "cost_kg": 40, "cost_l": 470, "npk": {"n": 20, "p": 25, "k": 25}},
    "Soybean": {"fertilizer": 140, "pesticide": 2.0, "cost_kg": 42, "cost_l": 490, "npk": {"n": 15, "p": 30, "k": 15}},
    "Chilli": {"fertilizer": 190, "pesticide": 2.8, "cost_kg": 46, "cost_l": 510, "npk": {"n": 25, "p": 20, "k": 25}},
    "Sugarcane": {"fertilizer": 250, "pesticide": 2.5, "cost_kg": 34, "cost_l": 440, "npk": {"n": 30, "p": 15, "k": 20}},
    "Groundnut": {"fertilizer": 145, "pesticide": 2.0, "cost_kg": 40, "cost_l": 470, "npk": {"n": 15, "p": 25, "k": 20}},
    "Banana": {"fertilizer": 260, "pesticide": 2.8, "cost_kg": 44, "cost_l": 490, "npk": {"n": 30, "p": 20, "k": 40}},
    "Mango": {"fertilizer": 210, "pesticide": 2.6, "cost_kg": 44, "cost_l": 490, "npk": {"n": 20, "p": 20, "k": 30}},
    "Cabbage": {"fertilizer": 170, "pesticide": 2.2, "cost_kg": 36, "cost_l": 460, "npk": {"n": 25, "p": 15, "k": 20}},
    "Cauliflower": {"fertilizer": 175, "pesticide": 2.3, "cost_kg": 36, "cost_l": 460, "npk": {"n": 25, "p": 15, "k": 20}},
    "Brinjal": {"fertilizer": 180, "pesticide": 2.4, "cost_kg": 38, "cost_l": 470, "npk": {"n": 20, "p": 20, "k": 25}},
    "Okra": {"fertilizer": 165, "pesticide": 2.3, "cost_kg": 38, "cost_l": 470, "npk": {"n": 20, "p": 20, "k": 20}},
}

SEVERITY_MULT = {"mild": 0.7, "moderate": 1.0, "severe": 1.4}
STAGE_MULT = {"seedling": 0.5, "vegetative": 1.0, "flowering": 1.15, "fruiting": 1.25}

# Area conversion to hectares
AREA_TO_HA = {"acre": 0.4047, "hectare": 1.0, "sqm": 0.0001}


def _base(crop: str):
    return CROP_BASE_DOSAGE.get(crop, {"fertilizer": 180, "pesticide": 2.5, "cost_kg": 40, "cost_l": 470, "npk": {"n": 20, "p": 20, "k": 20}})


def calculate(input_data: dict) -> dict:
    crop = input_data["crop_type"]
    area = float(input_data["area"])
    area_unit = input_data["area_unit"]
    severity = input_data["severity"]
    stage = input_data["growth_stage"]
    product = input_data.get("product_type", "fertilizer")

    base = _base(crop)
    hectares = area * AREA_TO_HA[area_unit]
    sev_mult = SEVERITY_MULT[severity]
    stage_mult = STAGE_MULT[stage]

    if product == "fertilizer":
        recommended_per_ha = base["fertilizer"]
        max_safe_per_ha = recommended_per_ha * 1.4
        qty_per_ha = recommended_per_ha * sev_mult * stage_mult
        qty = round(qty_per_ha * hectares, 2)
        unit = "kg"
        cost = round(qty * base["cost_kg"], 2)
        water = round(hectares * 400, 2)  # ~400 L per ha typical spray volume for foliar
        mix_ratio = f"{round(qty / max(water, 1) * 1000, 2)} g per L of water"
        reentry = 4
        warnings = [
            "Apply during early morning or evening; avoid mid-day heat",
            "Do not exceed the maximum safe dosage shown",
            "Wear gloves and mask while mixing",
            f"Keep livestock and children away for {reentry} hours after application",
        ]
    else:  # pesticide
        recommended_per_ha = base["pesticide"]
        max_safe_per_ha = recommended_per_ha * 1.3
        qty_per_ha = recommended_per_ha * sev_mult * stage_mult
        qty = round(qty_per_ha * hectares, 2)
        unit = "L"
        cost = round(qty * base["cost_l"], 2)
        water = round(hectares * 500, 2)
        mix_ratio = f"{round(qty / max(hectares, 0.01), 2)} L per hectare, diluted in {round(500)} L water/ha"
        reentry = 24
        warnings = [
            "Wear full PPE: gloves, mask, long sleeves, boots",
            "Do not spray before rain; wind speed must be below 10 km/h",
            f"Re-entry interval: {reentry} hours after application",
            "Observe pre-harvest interval printed on the product label",
            "Never mix pesticides without reading the label",
        ]

    return {
        "quantity_kg_or_l": qty,
        "unit": unit,
        "water_dilution_l": water,
        "mix_ratio": mix_ratio,
        "estimated_cost_inr": cost,
        "npk": base["npk"],
        "recommended_dosage_kg_per_ha": round(recommended_per_ha, 2),
        "max_safe_dosage_kg_per_ha": round(max_safe_per_ha, 2),
        "reentry_interval_hours": reentry,
        "safety_warnings": warnings,
    }


def list_crops() -> list[str]:
    return sorted(CROP_BASE_DOSAGE.keys())
