// Comprehensive Test Script for Blog Functionality
// Run this in browser console to test everything

console.log('🧪 Starting comprehensive test suite...');

// Test 1: Check if required libraries are loaded
function testLibraries() {
    console.log('\n📚 Testing libraries...');
    const markedLoaded = typeof marked !== 'undefined';

    console.log('marked.js:', markedLoaded ? '✅' : '❌');

    return markedLoaded;
}

// Test 2: Check DOM elements
function testDOMElements() {
    console.log('\n🏗️ Testing DOM elements...');
    const elements = {
        categoryList: document.getElementById("categoryList"),
        postContent: document.getElementById("postContent"),
        searchInput: document.getElementById("searchInput")
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        console.log(name + ':', element ? '✅' : '❌');
    });
    
    return Object.values(elements).every(el => el !== null);
}

// Test 3: Test posts JSON loading
async function testPostsLoading() {
    console.log('\n📄 Testing posts JSON loading...');
    try {
        const basePath = location.pathname.includes('/posts/') ? '../' : '';
        const response = await fetch(`${basePath}assets/posts.json`);
        console.log('Fetch response:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const posts = await response.json();
        console.log('Posts loaded:', posts.length);
        console.log('Sample post:', posts[0]);

        return posts;
    } catch (error) {
        console.error('Posts loading failed:', error);
        return null;
    }
}

// Test 4: Test post loading
async function testPostLoading() {
    console.log('\n📖 Testing post loading...');
    try {
        const response = await fetch('posts/welcome.md');
        console.log('Post fetch response:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const markdown = await response.text();
        console.log('Markdown length:', markdown.length);
        
        const html = marked.parse(markdown);
        console.log('HTML generated length:', html.length);
        
        return true;
    } catch (error) {
        console.error('Post loading failed:', error);
        return false;
    }
}

// Test 5: Test layout manager functionality
function testLayoutManager() {
    console.log('\n🎨 Testing layout manager...');
    
    if (typeof window.layoutManager === 'undefined') {
        console.error('❌ Layout manager not found globally');
        return false;
    }
    
    console.log('✅ Layout manager found');
    console.log('Layout manager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.layoutManager)));
    
    return true;
}

// Test 6: Test manual post loading
async function testManualPostLoad() {
    console.log('\n🔧 Testing manual post loading...');
    
    if (!window.layoutManager) {
        console.error('❌ Layout manager not available');
        return false;
    }
    
    try {
        await window.layoutManager.loadPost('posts/welcome.md', 'Welcome to Tech Blog');
        console.log('✅ Manual post loading successful');
        return true;
    } catch (error) {
        console.error('❌ Manual post loading failed:', error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running all tests...\n');
    
    const results = {
        libraries: testLibraries(),
        domElements: testDOMElements(),
        posts: await testPostsLoading(),
        postLoading: await testPostLoading(),
        layoutManager: testLayoutManager(),
        manualLoad: await testManualPostLoad()
    };
    
    console.log('\n📊 Test Results Summary:');
    Object.entries(results).forEach(([test, result]) => {
        const status = result ? '✅' : '❌';
        console.log(`${test}: ${status}`);
    });
    
    const overallSuccess = Object.values(results).every(result => !!result);
    console.log(`\n🎯 Overall: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return results;
}

// Auto-run tests when script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}

// Export test functions for manual use
window.blogTests = {
    runAll: runAllTests,
    testLibraries,
    testDOMElements,
    testPostLoading,
    testLayoutManager,
    testManualPostLoad
};

console.log('🧪 Test suite ready. Run window.blogTests.runAll() to test manually');