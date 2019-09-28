const fs = require('fs')

function findDupIndexSets(items) {
  let idsToIndices = {}
  let emailsToIndices = {}
  items.forEach((item, index) => {
    idsToIndices[item._id] = idsToIndices[item._id] || []
    idsToIndices[item._id].push(index)

    emailsToIndices[item.email] = emailsToIndices[item.email] || []
    emailsToIndices[item.email].push(index)
  })

  // Start off with the id-based dup sets, then consolidate them based on shared
  // emails in order to catch transitive dups,
  // e.g. {id: 1, email: "a@"}, {id: 1, email: "b@"}, {id: 2, email: "a@"}
  // NOTE: shallow copy okay since we don't use idsToIndices after this
  let dupIndexSets = idsToIndices

  Object.keys(dupIndexSets).forEach((key) => {
    // Iterate over keys so we can get updated values with consolidated indices removed
    let indexSet = dupIndexSets[key]
    let allEmailDupIndices = []
    indexSet.forEach((index) => {
      let item = items[index]
      let matchingEmailIndices = emailsToIndices[item.email]
      // remove the current index because it's already in the set and doesn't need moving
      matchingEmailIndices = matchingEmailIndices.filter((i) => i !== index)
      if (matchingEmailIndices.length > 0) {
        allEmailDupIndices = allEmailDupIndices.concat(matchingEmailIndices)
      }
    })

    // Find the sets these items were in and remove them
    allEmailDupIndices.forEach((emailDupIndex) => {
      let item = items[emailDupIndex]
      let oldSet = dupIndexSets[item._id]
      dupIndexSets[item._id] = oldSet.filter((i) => i !== emailDupIndex)
    })

    if (allEmailDupIndices.length > 0) {
      dupIndexSets[key] = indexSet.concat(allEmailDupIndices)
    }
  })
  dupIndexSets = Object.values(dupIndexSets)
  dupIndexSets = dupIndexSets.filter((s) => s.length > 0)
  dupIndexSets = dupIndexSets.map((s) => s.sort())

  return dupIndexSets
}

function isMoreRecentOrContemporaneous(item1, item2) {
  const date1 = Date.parse(item1.entryDate)
  const date2 = Date.parse(item2.entryDate)

  return date1 - date2 >= 0
}

function logItemOverwrite(oldItem, newItem) {
  Object.keys(oldItem).forEach((key) => {
    if (oldItem[key] === newItem[key]) {
      console.log("  " + key + " " + oldItem[key])
    } else {
      // -> is cuter, but sadly ambiguous because it could mean assign or map
      console.log(`  ${key}: ${newItem[key]} (was ${oldItem[key]})`)
    }
  })
}

function resolveDups(items) {
  uniqueItems = []
  let dupIndexSets = findDupIndexSets(items)
  dupIndexSets.forEach((indices) => {
    let betterItem = null
    let betterItemIndex = -1
    indices.forEach((index) => {
      let item = items[index]
      if (betterItem) {
        if (isMoreRecentOrContemporaneous(item, betterItem)) {
          // Log source/target indices because they're the only unambiguous identifier
          console.log(`Overwriting item at ${betterItemIndex} with item at ${index}`)
          logItemOverwrite(betterItem, item)
          betterItem = item
          betterItemIndex = index
        }
      } else {
        betterItem = item
        betterItemIndex = index
      }
    })

    if (betterItem) {
      uniqueItems.push(betterItem)
    }
  })

  return uniqueItems
}

function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node dedupe.js <filename.json>')
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
