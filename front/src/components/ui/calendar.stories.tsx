import {StoryObj, Meta} from '@storybook/react';

import Calendar from './calendar';

export default {
  title: 'calendar',
  component: Calendar,
  args: {
    
  },
} as Meta<typeof Calendar>;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {},
};
