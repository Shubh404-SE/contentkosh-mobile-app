import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AttemptScreenBase } from '../AttemptScreenBase';

describe('AttemptScreenBase', () => {
  test('submits answers when confirming submit from header', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onExitRequested = jest.fn();

    const { getByTestId } = render(
      <AttemptScreenBase
        title="Demo test"
        attemptKind="practice"
        startedAt={new Date().toISOString()}
        questions={[
          {
            id: 'q1',
            type: 3,
            questionText: 'Type something',
          },
        ]}
        onSubmit={onSubmit}
        onExitRequested={onExitRequested}
      />
    );

    fireEvent.press(getByTestId('attempt-submit-header'));
    fireEvent.press(getByTestId('attempt-submit-confirm'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith([{ questionId: 'q1' }]);
    });
  });

  test('captures text answer before submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <AttemptScreenBase
        title="Demo test"
        attemptKind="practice"
        startedAt={new Date().toISOString()}
        questions={[
          {
            id: 'q1',
            type: 3,
            questionText: 'Type something',
          },
        ]}
        onSubmit={onSubmit}
        onExitRequested={() => {}}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Enter a number…'), 'hello');
    fireEvent.press(getByTestId('attempt-submit-header'));
    fireEvent.press(getByTestId('attempt-submit-confirm'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([{ questionId: 'q1', textAnswer: 'hello' }]);
    });
  });
});
