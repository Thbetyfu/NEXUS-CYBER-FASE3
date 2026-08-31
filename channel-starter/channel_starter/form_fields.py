def inflate_flat_fields(form_dict: dict) -> dict:
    """Map offering_1_title / gallery_1_url / stat_1_number from HTML forms."""
    offerings = []
    for i in (1, 2, 3):
        title = str(form_dict.pop(f"offering_{i}_title", "") or "").strip()
        body = str(form_dict.pop(f"offering_{i}_body", "") or "").strip()
        if title or body:
            offerings.append({"title": title, "body": body})
    if offerings:
        form_dict["offerings"] = offerings

    stats = []
    for i in (1, 2, 3, 4):
        number = str(form_dict.pop(f"stat_{i}_number", "") or "").strip()
        label = str(form_dict.pop(f"stat_{i}_label", "") or "").strip()
        if number or label:
            stats.append({"number": number, "label": label})
    if stats:
        form_dict["stats"] = stats

    gallery = []
    for i in (1, 2, 3):
        image_url = str(form_dict.pop(f"gallery_{i}_url", "") or "").strip()
        title = str(form_dict.pop(f"gallery_{i}_title", "") or "").strip()
        caption = str(form_dict.pop(f"gallery_{i}_caption", "") or "").strip()
        if image_url or title or caption:
            gallery.append({"image_url": image_url, "title": title, "caption": caption})
    if gallery:
        form_dict["gallery"] = gallery
    return form_dict
