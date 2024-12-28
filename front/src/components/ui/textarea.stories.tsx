import {StoryObj, Meta} from '@storybook/react';

import Textarea from './textarea';

export default {
  title: 'textarea',
  component: Textarea,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof Textarea>;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {},
};
