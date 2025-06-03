# Planning

## Home Screen Structure

- ### Logo

- ### Search Bar

- ### Parks View Selection

  - #### Parks View (Select Park List Type)
  
    - By Country
    - Alphabetical

- Divider

- ### Parks List

  - #### Type: By Country

    - **Country Section**
      - Country Name
      - Parks List
        - Park Card
          - Park Name
          - Park Image (Background)
          - Tap to View

  - #### Type: Alphabetical

    - **Parks List**
      - Park Card
        - Park Name
        - Park Image (Background)
        - Tap to View

- ### Footer with Wartezeiten.APP credits

---

## Park Details Screen Structure

- ### Navbar

  - Back Button
  - Park Name
  - Refresh Button

- ### Park Image

- ### Park Opening Times

  - States
    - Open today: "Opening times"
    - Closed today: "The park is closed today"
    - Fetch error: "Opening times not available. Try again later."

- ### Note: Wait times are updated every 5 minutes

- ### Rides View Selection

  - #### Rides View (Select Ride List Type)

    - "Default" (Grouped by status, alphabetical within groups)
    - "Alphabetical" (All rides in alphabetical order, no grouping)
    - "Waiting Time (Asc)" (Grouped by status, sorted by waiting time within open rides group)
    - "Waiting Time (Desc)" (Grouped by status, sorted by waiting time within open rides group)

- Divider

- ### Rides List

  - #### Ride Card

    - Ride Name
    - Ride Status
      - Open: Show Waiting Time
        - 0-29 minutes: Show default style
        - 30-59 minutes: Show medium wait style
        - 60+ minutes: Show long wait style
      - Closed: Show closed status with icon
      - Maintenance: Show maintenance status with icon
      - Closed Ice: Show closed ice status with icon
      - Closed Weather: Show closed weather status with icon

- `Footer with Wartezeiten.APP credits`
