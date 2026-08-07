# CoffeeShop Cost Management System
Version : 1.0
Platform : Web
Tech Stack :
- HTML
- CSS
- Vanilla JavaScript
- LocalStorage (MVP)
- JSON Database

---

# Project Goal

Membuat sistem perhitungan COGS (HPP) yang jauh lebih mudah dibandingkan Excel.

Target user adalah owner coffee shop yang ingin mengetahui:

- Harga pokok setiap menu
- Profit setiap produk
- Margin
- Food Cost %
- Rekomendasi harga jual
- Breakdown seluruh bahan baku
- Simulasi perubahan harga bahan

Website harus responsive, modern, dan mudah digunakan bahkan tanpa tutorial.

---

# Main Modules

## 1. Dashboard

Menampilkan ringkasan bisnis.

Cards:

- Total Ingredients
- Total Recipes
- Average Food Cost
- Average Gross Profit
- Average Margin
- Total OPEX
- Total APEX

Charts:

- Food Cost Distribution
- Product Profit Ranking
- Highest Cost Ingredient
- Monthly Cost Trend (future)

---

## 2. Ingredient Management

Database seluruh bahan baku.

Setiap ingredient memiliki:

Nama

Kategori

Supplier

Brand

Purchase Unit

Example:

Milk

Buy Price

Rp 92.000

Purchase Quantity

1000 ml

Unit

ml

Yield %

(optional)

Waste %

(optional)

Minimum Stock

(optional)

Notes

---

System otomatis menghitung:

Cost per ml

Cost per gram

Cost per pcs

Cost per shot

Cost per teaspoon

tergantung unit.

---

Supported Units

gram
kg

ml
liter

pcs

pack

bottle

bag

box

shot

slice

tablespoon

teaspoon

custom

---

Features

Search

Filter

Favorite Ingredient

Archive

Duplicate

Import CSV

Export CSV

Bulk Edit

---

## 3. Recipe Builder

Halaman membuat menu.

Example

Spanish Latte

Ingredients

Espresso

30 ml

Fresh Milk

180 ml

Condensed Milk

20 gram

Ice

120 gram

Cup

1 pcs

Lid

1 pcs

Sticker

1 pcs

Straw

1 pcs

---

System otomatis mengambil Cost/ml dari Ingredient Database.

Output:

Ingredient Cost

Packaging Cost

Total Recipe Cost

Food Cost

COGS

---

Features

Drag & Drop Ingredient

Duplicate Recipe

Clone Recipe

Recipe Version

Recipe Notes

---

## 4. Packaging Management

Semua packaging dipisah dari ingredient.

Cup

Lid

Sleeve

Sticker

Paper Bag

Carrier

Straw

Tissue

Dll.

Packaging ikut dihitung ke COGS.

---

## 5. Pricing Calculator

Input:

Target Margin %

Target Profit %

Target Food Cost %

Tax

Service Charge

Marketplace Fee

Payment Gateway Fee

Discount

Royalty

Franchise Fee

Output:

Minimum Selling Price

Ideal Selling Price

Premium Selling Price

Break Even Price

Rounded Price

Psychological Price

Example

Rp34.700

↓

Recommended

Rp35.000

---

## 6. Operational Cost

Input:

Rent

Electricity

Internet

Salary

Cleaning

Gas

Water

Maintenance

POS Subscription

Music Subscription

Internet

Marketing

Others

System menghitung:

Monthly OPEX

Daily OPEX

Hourly OPEX

Cost per Product

---

## 7. Asset (CAPEX)

Coffee Machine

Grinder

Espresso Tools

Furniture

AC

Laptop

POS

Input

Purchase Price

Useful Life

Residual Value

System menghitung:

Depreciation

Monthly

Yearly

Per Cup

---

## 8. Profit Analysis

Per Product

Selling Price

COGS

Gross Profit

Gross Margin

Net Profit

Food Cost %

Contribution Margin

Status

Excellent

Good

Warning

Bad

---

Color Indicator

Green

<30%

Yellow

30-35%

Orange

35-40%

Red

>40%

---

## 9. Scenario Simulator

Example

Milk price naik 15%

↓

Semua menu otomatis berubah.

Owner bisa melihat:

Menu mana yang profit turun

Menu mana yang harus naik harga

Menu mana yang rugi

---

## 10. Reports

Export

PDF

Excel

CSV

Print

---

# Calculation Formula

Ingredient Cost

Purchase Price / Purchase Quantity

Recipe Cost

Ingredient Cost × Recipe Usage

Total COGS

Ingredient

+

Packaging

+

Waste

Food Cost %

COGS / Selling Price ×100

Gross Profit

Selling Price - COGS

Margin %

Gross Profit / Selling Price ×100

Break Even Price

COGS / Target Food Cost %

---

# UX

Sidebar Navigation

Dashboard

Ingredients

Packaging

Recipes

Pricing

OPEX

CAPEX

Reports

Settings

---

Theme

Minimal

White

Coffee Brown

Dark Mode

Rounded Card

Modern Dashboard

---

Search Everywhere

Ctrl + K

---

Tables

Sortable

Searchable

Filter

Pagination

---

Modal

Create Ingredient

Create Recipe

Confirmation Delete

---

Toast Notification

Saved

Deleted

Updated

Imported

---

# Future Features

Inventory

Stock Movement

Purchase Order

Supplier

Barcode

QR Recipe

Multi Outlet

Cloud Sync

Employee Login

Role Permission

Audit Log

Version History

API

Mobile App

AI Price Recommendation

AI Menu Engineering

Profit Forecast

Sales Integration

POS Integration

Marketplace Integration

WhatsApp Report

Telegram Report

Google Drive Backup

Auto Backup

---

# Local Storage Structure

ingredients

recipes

packaging

settings

assets

opex

reports

history

---

# Folder Structure

index.html

/assets

/css

style.css

theme.css

/components

/navbar.js

/sidebar.js

/modal.js

/pages

dashboard.js

ingredients.js

recipe.js

pricing.js

report.js

/utils

calculator.js

storage.js

formatter.js

validator.js

chart.js

/app.js

---

# UI Style

Modern SaaS Dashboard

Large White Card

Rounded 16px

Soft Shadow

Coffee Accent Color

Responsive

Desktop First
