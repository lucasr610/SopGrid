#!/bin/bash
# Script to rejoin split files after cloning from GitHub

echo "Rejoining split files..."

# Find all .partaa files (first parts of split files)
for partaa in $(find . -name "*.partaa"); do
    # Get the base filename without .partaa
    base_file="${partaa%.partaa}"
    echo "Rejoining: $base_file"
    
    # Join all parts back together
    cat "${base_file}".part* > "$base_file"
    
    # Remove the split parts
    rm "${base_file}".part*
    
    echo "Rejoined: $base_file"
done

echo "All files rejoined successfully!"