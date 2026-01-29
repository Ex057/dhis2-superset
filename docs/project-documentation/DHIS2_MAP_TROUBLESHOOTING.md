# DHIS2 Map Boundaries Not Displaying - Troubleshooting Guide

## Current Status

Based on the console logs, we can confirm:
- ✅ **161 boundaries successfully loaded** from DHIS2 API
- ✅ **Coordinates exist** (console shows `firstCoord: Array(2)`)
- ✅ **No geometry validation errors**
- ⚠️ **133 boundaries have no data** (only 28 have matching data)

## Possible Issues

### Issue 1: Boundaries Loading But Not Rendering

**Symptoms:**
- Console shows boundaries loaded (161 features)
- Console shows coordinates exist
- But map appears blank or shows only base map

**Causes:**
1. Coordinates might be in wrong format for Leaflet
2. Boundaries might be rendering outside visible area
3. Styling might make boundaries invisible (transparent)

### Issue 2: Only Partial Data Display

**Symptoms:**
- Some boundaries visible (28 with data)
- Most boundaries missing (133 without data)
- Console shows: `Match results: 0 by ID, 28 by name, 133 no match`

**This is EXPECTED behavior when `showAllBoundaries` is true:**
- Boundaries with data: Colored based on values
- Boundaries without data: Grey/no-data color
- If grey boundaries are invisible, check `legendNoDataColor` opacity

## Diagnostic Steps

### Step 1: Check What's Actually Rendering

Open browser console and look for these specific logs:

```javascript
[DHIS2Map] ✅ First boundary coordinate debug:
  - name: "Abim District"
  - geometryType: "Polygon" or "MultiPolygon"
  - sampleCoord: [lng, lat]  // Should be [30-34, 0-4] for Uganda
  - fullGeometry: {...}
```

```javascript
[DHIS2Map] 🌍 Coordinate location check:
  - lng: 32.x
  - lat: 2.x
  - inUganda: true  // Should be true for Uganda districts
```

```javascript
[DHIS2Map] 📍 First 3 boundaries with coords:
  - Each should have sampleCoord with valid [lng, lat]
```

### Step 2: Check Map View

**If map is blank:**
1. Check if `[MapAutoFocus]` log shows it's fitting to boundaries
2. Try manual zoom out to see if boundaries are outside view
3. Check browser dev tools > Elements > Look for `<path>` elements (Leaflet renders boundaries as SVG paths)

**If some boundaries visible:**
1. Count how many you see - should match data count (28)
2. Check if grey boundaries are there but very faint
3. Try adjusting legend no-data color opacity

### Step 3: Verify Coordinate Format

Run in browser console:
```javascript
// Check if boundaries are actually being passed to Leaflet
document.querySelectorAll('.leaflet-overlay-pane path').length
// Should return 161 (number of boundaries)

// If 0, boundaries aren't rendering at all
// If >0 but <161, some are being filtered out
```

### Step 4: Check Styling

The `getFeatureStyle` function determines colors:
```javascript
// Boundaries WITH data: colorScale(value)
// Boundaries WITHOUT data: noDataColorRgb (grey)
```

Check if no-data color has sufficient opacity:
```javascript
legendNoDataColor = { r: 204, g: 204, b: 204, a: 1 }
// a: 1 means fully opaque (visible)
// a: 0 means fully transparent (invisible)
```

## Quick Fixes to Try

### Fix 1: Force Clear All Caches

```javascript
// In browser console
indexedDB.deleteDatabase('dhis2_geo_cache');
Object.keys(localStorage).filter(k => k.startsWith('dhis2_map_cache_')).forEach(k => localStorage.removeItem(k));
location.reload();
```

### Fix 2: Check Boundary Display Setting

In chart configuration:
1. Go to **Customize** tab
2. Find **Show All Boundaries** option
3. Ensure it's **checked** (to show boundaries without data)

### Fix 3: Adjust No-Data Color

If boundaries are there but invisible:
1. Go to **Customize** tab → **Legend**
2. Find **No Data Color** setting
3. Change to a more visible color (e.g., light blue or yellow)
4. Ensure opacity is high (0.7-1.0)

### Fix 4: Verify Coordinate Validation Isn't Too Strict

Recent changes:
- Removed "null island" (0,0) rejection - was too aggressive
- Reverted 80% threshold - now requires all coordinates valid
- Extended coordinate range to ±180.1/90.1

If boundaries still not showing, check console for:
```
[filterValidFeatures] Filtered out X features with invalid geometries
```

If X > 0, coordinates are being rejected as invalid.

## Expected Console Output (Working State)

```javascript
[DHIS2Map] loadDHIS2GeoFeatures result: {
  totalCount: 161,
  cacheSource: '✅ Using cached data' or '🌐 Fresh from API'
}

[filterValidFeatures] Processing 161 features from API
// No "Filtered out X features" message = all passed validation

[DHIS2Map] ✅ First boundary coordinate debug: {
  name: "Abim District",
  geometryType: "Polygon",
  sampleCoord: [32.xxx, 2.xxx],  // Valid Uganda coordinates
  inUganda: true
}

[MapAutoFocus] Auto-fitting map to 161 boundaries

[DHIS2Map] Match results: 0 by ID, 28 by name, 133 no match
// This is EXPECTED - only 28 districts have data
```

## What Changed Recently

### Files Modified:
1. **DHIS2Map.tsx** - Removed aggressive cache clearing
2. **utils.ts** - Made coordinate validation more lenient

### Reverted Changes:
1. ❌ Null island rejection - Removed (was filtering valid boundaries)
2. ❌ 80% coordinate threshold - Reverted to 100% (was too lenient)

## If Boundaries Still Not Showing

### Collect This Information:

1. **Browser console output:**
   - Copy all `[DHIS2Map]` and `[filterValidFeatures]` logs
   - Look for any error messages

2. **Visual confirmation:**
   - Screenshot of the map
   - Is it completely blank or showing some boundaries?

3. **Dev tools inspection:**
   ```javascript
   // In browser console
   {
     paths: document.querySelectorAll('.leaflet-overlay-pane path').length,
     bounds: document.querySelector('.leaflet-overlay-pane').getBoundingClientRect(),
     hasGeoJSON: !!document.querySelector('.leaflet-overlay-pane svg')
   }
   ```

4. **Map configuration:**
   - Boundary levels selected
   - Show all boundaries setting
   - No-data color and opacity

### Possible Root Causes:

1. **Coordinate format mismatch** - DHIS2 sending coordinates in unexpected format
2. **Leaflet rendering issue** - React 19 compatibility problem
3. **CSS/styling issue** - Boundaries rendering but invisible
4. **Cache corruption** - Old cached data with wrong format

## Next Steps

If after trying all the above the boundaries still don't show:

1. Check if this is a **data issue** (only 28 districts have data) vs **rendering issue** (no boundaries at all)
2. Compare with a working chart - does any DHIS2 map work?
3. Check if the issue is specific to this dataset or all DHIS2 maps
4. Verify DHIS2 instance is returning valid GeoJSON

## Contact Information

If issue persists, provide:
- Console logs (all `[DHIS2Map]` messages)
- Screenshot of map
- Chart configuration (boundary levels, etc.)
- DHIS2 instance version
