/**
 * AWS Builder Center Badges & Activities Definitions
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const exportsObj = factory();
    root.BADGES_DATA = exportsObj.BADGES_DATA;
    root.RECURRING_ACTIVITIES = exportsObj.RECURRING_ACTIVITIES;
    if (typeof globalThis !== 'undefined') {
      globalThis.BADGES_DATA = exportsObj.BADGES_DATA;
      globalThis.RECURRING_ACTIVITIES = exportsObj.RECURRING_ACTIVITIES;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  const BADGES_DATA = [
    {
      id: 'idea-influencer',
      name: 'Idea Influencer',
      goal: 'Get 10 votes on your wishes.',
      type: 'counter',
      target: 10,
      unit: 'votes',
      category: 'wishes',
      icon: '💡'
    },
    {
      id: 'first-wish',
      name: 'First Wish',
      goal: 'Publish your first wish in AWS Wishlist.',
      type: 'checkbox',
      target: 1,
      unit: '',
      category: 'wishes',
      icon: '✨'
    },
    {
      id: 'knowledge-seeker',
      name: 'Knowledge Seeker',
      goal: 'Read 10 different articles.',
      type: 'counter',
      target: 10,
      unit: 'articles',
      category: 'learning',
      icon: '📖'
    },
    {
      id: 'discussion-debut',
      name: 'Discussion Debut',
      goal: 'Join the conversation by commenting on content.',
      type: 'checkbox',
      target: 1,
      unit: '',
      category: 'community',
      icon: '💬'
    },
    {
      id: 'first-article',
      name: 'First Article',
      goal: 'Publish your first article.',
      type: 'checkbox',
      target: 1,
      unit: '',
      category: 'publishing',
      icon: '✍️'
    },
    {
      id: 'hello-world',
      name: 'Hello, World!',
      goal: 'Complete the About section in your profile to introduce yourself in Builder Center.',
      type: 'checkbox',
      target: 1,
      unit: '',
      category: 'profile',
      icon: '👋'
    },
    {
      id: 'photo-finisher',
      name: 'Photo Finisher',
      goal: 'Upload a photo to your profile.',
      type: 'checkbox',
      target: 1,
      unit: '',
      category: 'profile',
      icon: '📷'
    },
    {
      id: '7-day-visit-streak',
      name: '7-Day Visit Streak',
      goal: 'Visit Builder Center daily for seven consecutive days while signed in.',
      type: 'streak',
      activityId: 'daily_visit',
      streakPeriod: 'daily',
      target: 7,
      unit: 'days',
      category: 'streaks',
      icon: '🔥'
    },
    {
      id: '7-day-comment-streak',
      name: '7-Day Comment Streak',
      goal: 'Comment daily for seven consecutive days.',
      type: 'streak',
      activityId: 'daily_comment',
      streakPeriod: 'daily',
      target: 7,
      unit: 'days',
      category: 'streaks',
      icon: '🔥'
    },
    {
      id: '7-day-like-streak',
      name: '7-Day Like Streak',
      goal: 'Like content daily for seven consecutive days.',
      type: 'streak',
      activityId: 'daily_like',
      streakPeriod: 'daily',
      target: 7,
      unit: 'days',
      category: 'streaks',
      icon: '🔥'
    },
    {
      id: '4-week-wish-vote-streak',
      name: '4-Week Wish Vote Streak',
      goal: 'Vote on wishes weekly for four consecutive weeks.',
      type: 'streak',
      activityId: 'weekly_wish_vote',
      streakPeriod: 'weekly',
      target: 4,
      unit: 'weeks',
      category: 'streaks',
      icon: '⚡'
    },
    {
      id: '4-week-article-publishing-streak',
      name: '4-Week Article Publishing Streak',
      goal: 'Publish an article weekly for four consecutive weeks.',
      type: 'streak',
      activityId: 'weekly_publish_article',
      streakPeriod: 'weekly',
      target: 4,
      unit: 'weeks',
      category: 'streaks',
      icon: '⚡'
    },
    {
      id: '30-day-visit-streak',
      name: '30-Day Visit Streak',
      goal: 'Visit Builder Center daily for 30 consecutive days while signed in.',
      type: 'streak',
      activityId: 'daily_visit',
      streakPeriod: 'daily',
      target: 30,
      unit: 'days',
      category: 'streaks',
      icon: '🏆'
    },
    {
      id: '30-day-comment-streak',
      name: '30-Day Comment Streak',
      goal: 'Comment daily for 30 consecutive days.',
      type: 'streak',
      activityId: 'daily_comment',
      streakPeriod: 'daily',
      target: 30,
      unit: 'days',
      category: 'streaks',
      icon: '🏆'
    },
    {
      id: '30-day-like-streak',
      name: '30-Day Like Streak',
      goal: 'Like content daily for 30 consecutive days.',
      type: 'streak',
      activityId: 'daily_like',
      streakPeriod: 'daily',
      target: 30,
      unit: 'days',
      category: 'streaks',
      icon: '🏆'
    },
    {
      id: '90-day-visit-streak',
      name: '90-Day Visit Streak',
      goal: 'Visit Builder Center daily for 90 consecutive days while signed in.',
      type: 'streak',
      activityId: 'daily_visit',
      streakPeriod: 'daily',
      target: 90,
      unit: 'days',
      category: 'streaks',
      icon: '👑'
    },
    {
      id: '90-day-comment-streak',
      name: '90-Day Comment Streak',
      goal: 'Comment daily for 90 consecutive days.',
      type: 'streak',
      activityId: 'daily_comment',
      streakPeriod: 'daily',
      target: 90,
      unit: 'days',
      category: 'streaks',
      icon: '👑'
    },
    {
      id: '90-day-like-streak',
      name: '90-Day Like Streak',
      goal: 'Like content daily for 90 consecutive days.',
      type: 'streak',
      activityId: 'daily_like',
      streakPeriod: 'daily',
      target: 90,
      unit: 'days',
      category: 'streaks',
      icon: '👑'
    },
    {
      id: 'valued-creator',
      name: 'Valued Creator',
      goal: 'Get 10 likes on five of your articles.',
      type: 'counter',
      target: 5,
      unit: 'articles with 10+ likes',
      category: 'publishing',
      icon: '🌟'
    },
    {
      id: 'meaningful-contributor',
      name: 'Meaningful Contributor',
      goal: 'Get 10 likes on five of your comments.',
      type: 'counter',
      target: 5,
      unit: 'comments with 10+ likes',
      category: 'community',
      icon: '🎯'
    }
  ];

  const RECURRING_ACTIVITIES = [
    {
      id: 'daily_visit',
      period: 'daily',
      name: 'Visit Builder Center',
      actionDesc: 'Visit Builder Center daily while signed in',
      icon: '🌐',
      url: 'https://builder.aws.com/profile?tab=badges',
      milestones: [
        { days: 7, badgeId: '7-day-visit-streak' },
        { days: 30, badgeId: '30-day-visit-streak' },
        { days: 90, badgeId: '90-day-visit-streak' }
      ]
    },
    {
      id: 'daily_comment',
      period: 'daily',
      name: 'Comment on Content',
      actionDesc: 'Comment daily on articles or community posts',
      icon: '💬',
      url: 'https://builder.aws.com/',
      milestones: [
        { days: 7, badgeId: '7-day-comment-streak' },
        { days: 30, badgeId: '30-day-comment-streak' },
        { days: 90, badgeId: '90-day-comment-streak' }
      ]
    },
    {
      id: 'daily_like',
      period: 'daily',
      name: 'Like Content',
      actionDesc: 'Like content daily across Builder Center',
      icon: '👍',
      url: 'https://builder.aws.com/',
      milestones: [
        { days: 7, badgeId: '7-day-like-streak' },
        { days: 30, badgeId: '30-day-like-streak' },
        { days: 90, badgeId: '90-day-like-streak' }
      ]
    },
    {
      id: 'weekly_wish_vote',
      period: 'weekly',
      name: 'Vote on Wishes',
      actionDesc: 'Vote on wishes weekly in AWS Wishlist',
      icon: '🗳️',
      url: 'https://builder.aws.com/wishlist',
      milestones: [
        { weeks: 4, badgeId: '4-week-wish-vote-streak' }
      ]
    },
    {
      id: 'weekly_publish_article',
      period: 'weekly',
      name: 'Publish an Article',
      actionDesc: 'Publish an article weekly',
      icon: '📝',
      url: 'https://builder.aws.com/',
      milestones: [
        { weeks: 4, badgeId: '4-week-article-publishing-streak' }
      ]
    }
  ];

  return { BADGES_DATA, RECURRING_ACTIVITIES };
});
