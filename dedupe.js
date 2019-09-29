const fs = require('fs')

function isMoreRecentOrContemporaneous(item1, item2) {
  const date1 = Date.parse(item1.entryDate)
  const date2 = Date.parse(item2.entryDate)

  return date1 - date2 >= 0
}

function logItemOverwrite(betterInfo, worseInfo) {
  // Log indices because they're the only unambiguous identifier
  console.log(`Changing data at index ${worseInfo.index} to data at index ${betterInfo.index}`)

  Object.keys(worseInfo.item).forEach((key) => {
    if (worseInfo.item[key] === betterInfo.item[key]) {
      console.log("  " + key + ": " + worseInfo.item[key])
    } else {
      // logging "<value1> -> <value2>" is cuter, but sadly ambiguous because
      // it could mean assign value1 to value2 or map value1 to value2
      console.log(`  ${key}: ${betterInfo.item[key]} (was ${worseInfo.item[key]})`)
    }
  })
}

function resolveDups(items) {
  items.forEach((item, index) => {
    if (item === null) {
      return
    }

    // Keep track of all ids and emails of dups so we get transitivity
    // e.g. {id: 1, email: "a@"}, {id: 1, email: "b@"}, {id: 2, email: "a@"}
    // Should all be dups, even though items 2 and 3 are distinct wrt each other
    // Use objects instead of arrays so lookup is faster
    let equivalentIDsHash = {}
    equivalentIDsHash[item._id] = true
    let equivalentEmailsHash = {}
    equivalentEmailsHash[item.email] = true

    // iterate over items after this one
    for (let otherIndex = index + 1; otherIndex < items.length; otherIndex++) {
      let otherItem = items[otherIndex]
      if (otherItem === null) {
        continue;
      }

      if (equivalentIDsHash[otherItem._id] || equivalentEmailsHash[otherItem.email]) {
        equivalentIDsHash[otherItem._id] = true
        equivalentEmailsHash[otherItem.email] = true

        let worseInfo, betterInfo
        if (isMoreRecentOrContemporaneous(otherItem, item)) {
          betterInfo = { index: otherIndex, item: otherItem}
          worseInfo = { index: index, item: item}
        } else {
          betterInfo = { index: index, item: item}
          worseInfo = { index: otherIndex, item: otherItem}
        }

        logItemOverwrite(betterInfo, worseInfo)
        items[index] = betterInfo.item
        items[otherIndex] = null
      }
    }
  })

  return items.filter((i) => i !== null)
}

function main() {
  if (process.argv.length != 3) {
    console.log("Usage: node dedupe.js <filename.json>")
  } else {
    const filename = process.argv[2]
    let items = []

    try {
      let contents = fs.readFileSync(filename)
      items = JSON.parse(contents)["leads"]
    } catch (error) {
      console.log("Error reading leads json from file: " + error)
    }

    let uniqueItems = resolveDups(items)
    console.log("Found unique items:")
    console.log(uniqueItems)
  }
}

main()
