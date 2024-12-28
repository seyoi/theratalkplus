import {StoryObj, Meta} from '@storybook/react';

import label from './label';

export default {
  title: 'label',
  component: label,
  args: {
    //TODO: Add args here
  },
} as Meta<typeof label>;

type Story = StoryObj<typeof label>;

export const Default: Story = {
  args: {},
};
