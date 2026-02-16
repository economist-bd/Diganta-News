/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // এখানে আপনি চাইলে নিজস্ব ফন্ট বা কালার যুক্ত করতে পারেন
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [
    // আপনার অ্যাপে 'prose' ক্লাস ব্যবহার করা হলে এই প্লাগিনটি লাগতে পারে
    // require('@tailwindcss/typography'),
  ],
}