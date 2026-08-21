# SEC Regulation A+ Offering Tracker

Track new SEC Form 1-A filings — the offering statement a company
files for a Regulation A+ "mini-IPO," an SEC-qualified public
offering open to non-accredited investors that's exempt from full IPO
registration — via the official [EDGAR full text
search](https://www.sec.gov/edgar/search/) API. Search by keyword, or
leave blank for all new Reg A+ offerings market-wide.

Built for fintech, crowdfunding, and deal-tracking teams who want to
catch a new Reg A+ offering on day one.

## Input

```json
{
  "keyword": "",
  "includeAmendments": false,
  "daysBack": 30,
  "maxResults": 50
}
```

| Field | Type | Description |
|---|---|---|
| `keyword` | string | Free-text search across the filing, matching the issuer's name and filing text. Leave blank for all new Reg A+ offerings market-wide. |
| `includeAmendments` | boolean | By default only original Form 1-A filings are returned (new offerings). Turn this on to also include 1-A/A amendments to already-filed offerings. Default `false`. |
| `daysBack` | number | How many days back from today to search, by filing date. Default `30`, max `120`. |
| `maxResults` | number | Maximum number of filings to return, most recently filed first. Default `50`, max `100`. |

## Output

One record per filing:

```json
{
  "accessionNumber": "0002141083-26-000001",
  "form": "1-A",
  "isAmendment": false,
  "issuerName": "ECOSPIRE GLOBAL INC.",
  "issuerCik": "0002141083",
  "issuerTickers": null,
  "filingDate": "2026-08-20",
  "businessLocation": "Laguna Beach, CA",
  "incorporatedIn": "CA",
  "sicCode": null,
  "offeringFileNumber": "024-12807",
  "filingUrl": "https://www.sec.gov/Archives/edgar/data/2141083/000214108326000001-index.htm"
}
```

A Reg A+ offering file number starts with `024-`, distinct from a
traditional S-1 IPO registration number (which starts with `333-`) —
this actor is a Reg A+-specific sibling to [SEC IPO Registration
Tracker](https://github.com/timmKal01/sec-ipo-registration-tracker),
not a duplicate of it.

## How it works

Direct calls to the official SEC EDGAR full text search API
(`efts.sec.gov`) — no proxy, no key, no scraping. Same proven
mechanism as this portfolio's other SEC filing actors.

## Pricing note

Billed per **search** (one run), not per filing returned.

## Related products

- [SEC IPO Registration Tracker](https://github.com/timmKal01/sec-ipo-registration-tracker) — traditional Form S-1 IPO registrations, a related but legally distinct offering type
- [SEC 8-K Material Event Tracker](https://github.com/timmKal01/sec-8k-material-event-tracker)
- [Form D Fundraising Tracker](https://github.com/timmKal01/form-d-fundraising-tracker)
