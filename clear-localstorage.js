// Script to clear localStorage and reset language preference
localStorage.removeItem('language');
console.log('LocalStorage cleared. Language preference reset to default.');
console.log('Current localStorage:', Object.keys(localStorage));
