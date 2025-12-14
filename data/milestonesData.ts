
import type { Milestone } from '@/components/BadgeDetailBottomSheet';

export const MILESTONE_COLORS = {
  YELLOW: '#FFD93D',
  PINK: '#FFB6E1',
  GREEN: '#2DD4A3',
};

export const milestonesData: Milestone[] = [
  // Row 1
  {
    id: 'name_fame',
    name: 'Name Fame',
    description: 'Captured baby saying their own name',
    color: MILESTONE_COLORS.YELLOW,
    achieved: false,
    progress: '0/1',
    lockedImage: require('@/assets/images/a613b109-6a8f-48b8-a73c-66bb577ff540.png'),
    unlockedImage: require('@/assets/images/2d4fd1e6-bc9e-4f93-bf31-fb77a5b45c9f.png'),
  },
  {
    id: 'super_fan',
    name: 'Super Fan',
    description: 'Loved 50 books',
    color: MILESTONE_COLORS.PINK,
    achieved: false,
    progress: '0/50',
  },
  {
    id: 'animal_friend',
    name: 'Animal Friend',
    description: 'Said 10 animal words',
    color: MILESTONE_COLORS.GREEN,
    achieved: false,
    progress: '0/10',
  },
  // Row 2
  {
    id: 'story_lover',
    name: 'Story Lover',
    description: 'Loved 30 books (rated "Loved it")',
    color: MILESTONE_COLORS.PINK,
    achieved: false,
    progress: '0/30',
  },
  {
    id: 'food_fan',
    name: 'Food Fan',
    description: 'Said 10 food words',
    color: MILESTONE_COLORS.GREEN,
    achieved: false,
    progress: '0/10',
  },
  {
    id: 'color_caller',
    name: 'Color Caller',
    description: 'Said 5 color words',
    color: MILESTONE_COLORS.GREEN,
    achieved: false,
    progress: '0/5',
  },
  // Row 3
  {
    id: 'recognition_star',
    name: 'Recognition Star',
    description: 'Recognized 50 words',
    color: MILESTONE_COLORS.GREEN,
    achieved: false,
    progress: '0/50',
  },
  {
    id: 'author_fan',
    name: 'Author Fan',
    description: 'Read 5 books by same author',
    color: MILESTONE_COLORS.PINK,
    achieved: false,
    progress: '0/5',
  },
  {
    id: 'progress_tracker',
    name: 'Progress Tracker',
    description: '3 videos of same word (showing progress)',
    color: MILESTONE_COLORS.YELLOW,
    achieved: false,
    progress: '0/3',
  },
  // Row 4
  {
    id: 'critic',
    name: 'Critic',
    description: 'Gave 10 "Didn\'t vibe" ratings (being honest!)',
    color: MILESTONE_COLORS.PINK,
    achieved: false,
    progress: '0/10',
  },
  {
    id: 'body_expert',
    name: 'Body Expert',
    description: 'Said 10 body part words',
    color: MILESTONE_COLORS.GREEN,
    achieved: false,
    progress: '0/10',
  },
  {
    id: 'taste_maker',
    name: 'Taste Maker',
    description: 'Rated 50 books total (any rating)',
    color: MILESTONE_COLORS.PINK,
    achieved: false,
    progress: '0/50',
  },
];
